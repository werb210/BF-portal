// BF_PORTAL_SECURE_TOKEN_STORAGE_v422 - restore Keychain tokens before render.
import { hydrateSecureTokens, NATIVE_SESSION_KEYS } from "./lib/secureStore";
import { getAuthToken } from "@/lib/authToken";
import "./styles/globals.css";
import { reportError } from "@/utils/errorReporter";
import "@/lib/authSync";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { validateStartupToken } from "@/bootstrap";
import { AuthProvider } from "@/auth/AuthProvider";
import { bfAcquireSilentO365Tokens, bfRestoreActiveMsalAccount, ensureMsalInitialized, msalClient } from "@/auth/msal";
import { bfRehydrateSession } from "@/auth/session";
import { api } from "@/api";
import { getActiveSilo } from "@/config/api";
import { API_BASE } from "@/config/api";
import { registerPortalSW } from "./pwa/registerSW";
import { reloadOnceForChunkError } from "@/lib/lazyWithRetry";

import ErrorBoundary from "@/components/system/ErrorBoundary";
import App from "./App";
import "./index.css";
import "./styles/light-inputs.css";
import "./styles/bi-theme.css"; // BF_PORTAL_BLOCK_v_BI_THEME_AWARE_v1
import { initTheme } from "@/theme/theme";
import { installDocumentPreview } from "./native/documentPreviewDelegate";
import { installNativeFileInputs } from "./native/nativeFileInput"; // BF_PORTAL_v842_MAC_FILE_PICKER

initTheme();
// v115-doc-preview: use native Quick Look for document links on iPad.
installDocumentPreview();
// BF_PORTAL_v842_MAC_FILE_PICKER - on a Mac, file inputs use the app's own picker (WebKit's crashed on OneDrive files).
void installNativeFileInputs();

(window as any).__SILO__ = getActiveSilo();

// BF_PORTAL_ERROR_REPORTING_v1 - these logged to a console nobody reads in
// production. Keep the console output for local debugging; also send it
// somewhere durable.
window.addEventListener("unhandledrejection", (e) => {
  console.error("❌ UNHANDLED PROMISE:", e.reason);
  reportError("unhandledrejection", e.reason);
});

window.addEventListener("error", (e) => {
  console.error("❌ RUNTIME ERROR:", e.error);
  reportError("runtime", e.error, { filename: e.filename, line: e.lineno });
});

// BF_PORTAL_LAZY_RETRY_v784 - Vite fires this when a preload of a hashed
// chunk fails (usually a stale tab after a deploy). Reload once, guarded by
// the same sessionStorage timestamp as lazyWithRetry; if we already reloaded
// recently, let the error propagate to the ErrorBoundary.
window.addEventListener("vite:preloadError", (event) => {
  if (reloadOnceForChunkError()) event.preventDefault();
});

console.log("🔥 PORTAL BOOT");
console.log("🧠 ACTIVE SILO:", (window as any).__SILO__);
console.log("API BASE:", API_BASE);

async function assertBackend() {
  const mode = import.meta.env.MODE;

  if (mode === "test" || mode === "production") return;

  await api("/health", {
    headers: { "x-skip-auth": "true" },
  });
}

async function bootstrap() {
  // BF_PORTAL_v789_NATIVE_SESSION_MEMORY - native: Keychain -> in-memory cache (never localStorage).
  await hydrateSecureTokens(NATIVE_SESSION_KEYS).catch(() => undefined);

  if (!(await validateStartupToken())) return;

  await assertBackend();

  // Process MSAL redirect responses before mounting the app tree.
  await ensureMsalInitialized();
  bfRestoreActiveMsalAccount(); // BF_MAIN_ACTIVE_ACCOUNT_v28
  // BF_MAIN_SILENT_v30
  const authJwt = getAuthToken();
  void bfAcquireSilentO365Tokens(authJwt);
  // BF_MAIN_REDIRECT_DIAG_v24
  const redirectResult = await msalClient.handleRedirectPromise().catch((err) => {
    console.error("[msal.diag] handleRedirectPromise failed", err);
    return null;
  });
  console.log("[msal.diag] handleRedirectPromise.result", {
    hadResult: Boolean(redirectResult),
    account: redirectResult?.account?.username ?? null,
    idTokenClaims: redirectResult?.idTokenClaims ? "present" : "absent",
    authTokenPresent: Boolean(getAuthToken()),
  });
  // BF_PORTAL_O365_REDIRECT_v55 — clear the once-per-session guard after
  // a successful redirect so subsequent silent failures can retry.
  if (redirectResult && typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem("bf_msal_redirect_attempted");
  }
  await bfRehydrateSession();

  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </AuthProvider>
      </BrowserRouter>
    </React.StrictMode>,
  );

  registerPortalSW();
}

void bootstrap();
