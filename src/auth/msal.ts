import { BrowserAuthError, InteractionRequiredAuthError, PublicClientApplication } from "@azure/msal-browser";
import { setGraphAccessToken } from "@/lib/graphToken";

import { microsoftAuthConfig } from "@/config/microsoftAuth";
import { featureO365Scopes, signInO365Scopes } from "@/auth/o365Scopes"; // BF_PORTAL_O365_SCOPES_v275 + v789
import { api } from "@/api";

const isIos = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);

export const msalClient = new PublicClientApplication({
  auth: {
    clientId: microsoftAuthConfig.clientId || "00000000-0000-0000-0000-000000000000",
    authority: microsoftAuthConfig.authority,
    redirectUri: microsoftAuthConfig.redirectUri,
  },
  cache: {
    // BF_PORTAL_v789_MSAL_SESSION_STORAGE - Microsoft refresh and access tokens no longer persist in
    // localStorage across browser restarts; they live for the tab session.
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: isIos,
  },
});

let initPromise: Promise<void> | null = null;

export function ensureMsalInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = msalClient.initialize().catch((error) => {
      initPromise = null;
      throw error;
    });
  }
  return initPromise;
}

export const initializeMsalClient = ensureMsalInitialized;

// BF_MSAL_ACTIVE_ACCOUNT_v28 — Block 28
// Restore active account from cache after initialize() so MSAL state mirrors
// the already rehydrated server session on hard reload.
export function bfRestoreActiveMsalAccount(): void {
  try {
    const existing = msalClient.getActiveAccount();
    if (existing) return;
    const accounts = msalClient.getAllAccounts();
    const cachedAccount = accounts[0] ?? null;
    if (cachedAccount) {
      msalClient.setActiveAccount(cachedAccount);
      console.log("[msal.diag] active-account.restored", { username: cachedAccount.username ?? null });
    }
  } catch (error) {
    console.warn("[msal.diag] active-account.restore.failed", error);
  }
}

// BF_MSAL_SILENT_v30 — Block 30
export async function bfAcquireSilentO365Tokens(authJwt: string | null, opts?: { allowRedirect?: boolean }): Promise<boolean> {
  const allowRedirect = opts?.allowRedirect ?? false;
  try {
    const account = msalClient.getActiveAccount() ?? msalClient.getAllAccounts()[0] ?? null;
    if (!account) {
      console.log("[msal.silent] no cached account — user must sign in");
      return false;
    }

    // BF_PORTAL_BLOCK_v148_CREATE_LENDER_AND_MSAL_v1 — include offline_access
    // so MSAL can mint a refresh token. Without it, silent acquisition
    // relies on the iframe re-auth path which modern browsers block.
    // Aligns with config/microsoftAuth.ts which already had it.
    const scopesEnv = import.meta.env.VITE_MSAL_SCOPES || "User.Read,Mail.Send,Mail.ReadWrite,Calendars.ReadWrite,Tasks.ReadWrite,offline_access";
    const scopes = signInO365Scopes(String(scopesEnv)); // BF_PORTAL_O365_SCOPES_v275

    console.log("[msal.silent] acquire.start", { username: account.username ?? null, scopes });
    const result = await msalClient.acquireTokenSilent({ account, scopes });
    if (!result?.accessToken) {
      console.warn("[msal.silent] acquire returned no accessToken");
      return false;
    }

    // BF_PORTAL_MSAL_TOKEN_SECURE_v425 - a live Graph token in localStorage is
    // UserDefaults on the iPad build: unencrypted and in device backups. Keychain
    // on native, session-scoped on web, and the plain copy is cleared either way.
    await setGraphAccessToken(String(result.accessToken));
    console.log("[msal.silent] acquire.ok", {
      hasAccess: Boolean(result.accessToken),
      hasId: Boolean(result.idToken),
      expiresOn: result.expiresOn ?? null,
    });

    if (authJwt) {
      const apiBase = import.meta.env.VITE_API_URL || "https://server.boreal.financial";
      try {
        const response = await fetch(`${apiBase}/api/users/me/o365-tokens`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authJwt}`,
          },
          credentials: "include",
          body: JSON.stringify({
            idToken: result.idToken,
            accessToken: result.accessToken,
            account: { username: account.username ?? null, homeAccountId: account.homeAccountId ?? null },
            expiresOn: result.expiresOn ?? null,
          }),
        });
        console.log("[msal.silent] server.notified", { status: response.status });
        // BF_MSAL_TOKENS_SAVED_EVENT_v34 — fire window event so UI components
        // (ProfileSettings) can re-fetch /api/users/me without a reload.
        if (response.status >= 200 && response.status < 300 && typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("bf-msal-tokens-saved", {
            detail: { email: account.username ?? null }
          }));
        }
      } catch (postError) {
        console.warn("[msal.silent] server notify failed", postError);
      }
    }

    return true;
  } catch (error: any) {
    const name = error?.name || "";
    const message = error?.message || String(error);

    if (name === "InteractionRequiredAuthError" || /interaction_required|consent_required|login_required/i.test(message)) {
      console.log("[msal.silent] interaction required — user must click Connect Microsoft 365", { name, message });
      return false;
    }

    // BF_PORTAL_O365_REDIRECT_v55 — when silent acquisition fails because
    // the MSAL iframe is blocked (third-party cookies disabled / Safari
    // ITP / Chrome's incremental tightening), fall back to a full-page
    // acquireTokenRedirect. The redirect path doesn't rely on iframes
    // and survives modern browser cookie policy. We only do this once
    // per page load to avoid redirect loops.
    const isIframeBlocked =
      error instanceof BrowserAuthError &&
      ["monitor_window_timeout", "empty_window_error", "popup_window_error", "block_iframe_reload"].includes(error.errorCode);

    if (isIframeBlocked) {
      // BF_PORTAL_O365_NO_BOOTSTRAP_REDIRECT_v1 — a background/bootstrap silent
      // acquire must NEVER full-page-redirect: navigating away unloads the SPA
      // and destroys the Twilio dialer device (callers unreachable). Only an
      // interactive caller (the "Connect Microsoft 365" button) may redirect.
      if (!allowRedirect) {
        console.warn("[msal.silent] iframe blocked — skipping full-page redirect (not interactive); connect O365 from Settings", { name, message });
        return false;
      }
      const REDIRECT_GUARD_KEY = "bf_msal_redirect_attempted";
      const alreadyTried = typeof sessionStorage !== "undefined" && sessionStorage.getItem(REDIRECT_GUARD_KEY) === "1";
      if (alreadyTried) {
        console.warn("[msal.silent] iframe blocked AND redirect already attempted this session — giving up", { name, message });
        return false;
      }
      try {
        if (typeof sessionStorage !== "undefined") sessionStorage.setItem(REDIRECT_GUARD_KEY, "1");
        const scopesEnv = import.meta.env.VITE_MSAL_SCOPES || "User.Read,Mail.Send,Mail.ReadWrite,Mail.ReadWrite.Shared,Calendars.ReadWrite,Tasks.ReadWrite,offline_access";
        const scopes = signInO365Scopes(String(scopesEnv)); // BF_PORTAL_O365_SCOPES_v275
        const account = msalClient.getActiveAccount() ?? msalClient.getAllAccounts()[0] ?? null;
        console.log("[msal.silent] iframe blocked — falling back to acquireTokenRedirect", { name });
        await msalClient.acquireTokenRedirect({ scopes, account: account ?? undefined });
        // acquireTokenRedirect navigates away; the line below is unreachable.
        return false;
      } catch (redirectError: any) {
        console.warn("[msal.silent] redirect fallback failed", {
          name: redirectError?.name, message: redirectError?.message,
        });
        return false;
      }
    }

    console.warn("[msal.silent] acquire failed", { name, message });
    return false;
  }
}

// BF_PORTAL_v789_INCREMENTAL_CONSENT - ask for an extra Microsoft permission (Mail.ReadWrite,
// Files.ReadWrite) at the moment a feature needs it. Silent first; with `interactive` a consent popup is
// shown when Microsoft needs one (call it from a click). The resulting token is handed to BF-Server,
// which makes the Graph calls. Returns true when the token now carries the scopes.
const grantedScopes = new Set<string>();
const lastSilentMiss = new Map<string, number>();
const SILENT_RETRY_MS = 5 * 60_000;
const SILENT_TIMEOUT_MS = 8_000;

function isInteractionRequired(error: unknown): boolean {
  const e = error as { name?: string; message?: string; errorCode?: string } | null;
  return error instanceof InteractionRequiredAuthError
    || e?.name === "InteractionRequiredAuthError"
    || /interaction_required|consent_required|login_required|no_account/i.test(`${e?.errorCode ?? ""} ${e?.message ?? ""}`);
}

export async function ensureO365Scopes(extra: readonly string[], opts: { interactive?: boolean } = {}): Promise<boolean> {
  const key = extra.map((s) => s.toLowerCase()).sort().join(" ");
  if (extra.every((s) => grantedScopes.has(s.toLowerCase()))) return true;
  if (!opts.interactive && Date.now() - (lastSilentMiss.get(key) ?? 0) < SILENT_RETRY_MS) return false;
  await ensureMsalInitialized();
  const scopesEnv = import.meta.env.VITE_MSAL_SCOPES || "User.Read,Mail.Send,Calendars.ReadWrite,Tasks.ReadWrite,offline_access";
  const scopes = featureO365Scopes(String(scopesEnv), extra);
  const account = msalClient.getActiveAccount() ?? msalClient.getAllAccounts()[0] ?? null;

  let result: { accessToken?: string; expiresOn?: Date | null } | null = null;
  try {
    if (!account) throw new Error("no_account");
    // A silent call can hang when another tab holds the MSAL lock; never let a feature wait on it forever.
    result = await Promise.race([
      msalClient.acquireTokenSilent({ scopes, account }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("silent_timeout")), SILENT_TIMEOUT_MS)),
    ]);
  } catch (error) {
    if (!opts.interactive) {
      lastSilentMiss.set(key, Date.now());
      return false;
    }
    if (!isInteractionRequired(error) && (error as Error)?.message !== "silent_timeout") throw error;
    result = await msalClient.acquireTokenPopup({ scopes, account: account ?? undefined });
  }
  if (!result?.accessToken) return false;

  await setGraphAccessToken(String(result.accessToken));
  await api.post("/api/users/me/o365-tokens", {
    access_token: result.accessToken,
    expires_in: result.expiresOn ? Math.max(0, Math.floor((result.expiresOn.getTime() - Date.now()) / 1000)) : null,
    account_id: account?.homeAccountId ?? null,
  });
  for (const s of extra) grantedScopes.add(s.toLowerCase());
  lastSilentMiss.delete(key);
  return true;
}

/** Test seam. */
export function __resetO365Consent(): void {
  grantedScopes.clear();
  lastSilentMiss.clear();
}
