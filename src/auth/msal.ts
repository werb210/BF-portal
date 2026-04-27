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
