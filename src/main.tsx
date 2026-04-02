import "@/lib/networkGuard";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { validateStartupToken } from "@/bootstrap";
import { apiClient } from "@/lib/apiClient";

import { ErrorBoundary as ReactErrorBoundary } from "react-error-boundary";

import { assertEnv } from "./config/env";
import { ErrorFallback } from "./components/ErrorBoundary";

import App from "./App";
import "./index.css";

const t = localStorage.getItem("token");
if (t === "null" || t === "undefined") {
  localStorage.removeItem("token");
}

assertEnv();

window.addEventListener("unhandledrejection", (e) => {
  console.error("[UNHANDLED PROMISE]", e.reason);
});

window.addEventListener("error", (e) => {
  console.error("[RUNTIME ERROR]", e.error);
});

async function assertBackend() {
  const mode = import.meta.env.MODE;

  if (mode === "test" || mode === "production") return;

  await apiClient("/health", { skipAuth: true });
}

async function bootstrap() {
  if (!validateStartupToken()) return;

  await assertBackend();

  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <BrowserRouter>
        <ReactErrorBoundary FallbackComponent={ErrorFallback}>
          <App />
        </ReactErrorBoundary>
      </BrowserRouter>
    </React.StrictMode>,
  );
}

void bootstrap();
