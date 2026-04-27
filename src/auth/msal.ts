import { PublicClientApplication } from "@azure/msal-browser";

import { microsoftAuthConfig } from "@/config/microsoftAuth";

const isIos = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);

export const msalClient = new PublicClientApplication({
  auth: {
    clientId: microsoftAuthConfig.clientId || "00000000-0000-0000-0000-000000000000",
    authority: microsoftAuthConfig.authority,
    redirectUri: microsoftAuthConfig.redirectUri,
  },
  cache: {
    cacheLocation: "localStorage",
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
export async function bfAcquireSilentO365Tokens(authJwt: string | null): Promise<boolean> {
  try {
    const account = msalClient.getActiveAccount() ?? msalClient.getAllAccounts()[0] ?? null;
    if (!account) {
      console.log("[msal.silent] no cached account — user must sign in");
      return false;
    }

    const scopesEnv = import.meta.env.VITE_MSAL_SCOPES || "User.Read,Mail.Send,Calendars.ReadWrite,Tasks.ReadWrite";
    const scopes = String(scopesEnv)
      .split(",")
      .map((scope) => scope.trim())
      .filter(Boolean);

    console.log("[msal.silent] acquire.start", { username: account.username ?? null, scopes });
    const result = await msalClient.acquireTokenSilent({ account, scopes });
    if (!result?.accessToken) {
      console.warn("[msal.silent] acquire returned no accessToken");
      return false;
    }

    localStorage.setItem("msgraph_access_token", String(result.accessToken));
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

    console.warn("[msal.silent] acquire failed", { name, message });
    return false;
  }
}
