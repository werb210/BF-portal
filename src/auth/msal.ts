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
