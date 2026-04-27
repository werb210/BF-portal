import "./styles/globals.css";
import "@/lib/authSync";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { validateStartupToken } from "@/bootstrap";
import { AuthProvider } from "@/auth/AuthProvider";
import { msalClient } from "@/auth/msal";
import { api } from "@/api";
import { getSilo } from "./lib/silo";
import { API_BASE } from "@/config/api";
import { registerPortalSW } from "./pwa/registerSW";

import ErrorBoundary from "@/components/system/ErrorBoundary";
import App from "./App";
import "./index.css";
import "./styles/light-inputs.css";

(window as any).__SILO__ = getSilo();

window.addEventListener("unhandledrejection", (e) => {
  console.error("❌ UNHANDLED PROMISE:", e.reason);
});

window.addEventListener("error", (e) => {
  console.error("❌ RUNTIME ERROR:", e.error);
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
  if (!(await validateStartupToken())) return;

  await assertBackend();

  // Process MSAL redirect responses before mounting the app tree.
  await msalClient.handleRedirectPromise().catch((err) => {
    console.error("[msal] handleRedirectPromise failed", err);
    return null;
  });

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
