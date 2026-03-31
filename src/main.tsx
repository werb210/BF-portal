import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import ErrorBoundary from "./components/ErrorBoundary";
import { getTokenOrFail } from "@/lib/auth";

export function enforceStartupAuth() {
  if (window.location.pathname === "/login") {
    return;
  }

  try {
    getTokenOrFail();
  } catch {
    window.location.href = "/login";
    throw new Error("[BOOT BLOCKED]");
  }
}

enforceStartupAuth();

window.addEventListener("unhandledrejection", (e) => {
  console.error("[UNHANDLED PROMISE]", e.reason);
});

window.addEventListener("error", (e) => {
  console.error("[RUNTIME ERROR]", e.error);
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>
);
