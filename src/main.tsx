import "@/lib/networkGuard";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { validateStartupToken } from "@/bootstrap";

import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";

const t = localStorage.getItem("token");
if (t === "null" || t === "undefined") {
  localStorage.removeItem("token");
}

window.addEventListener("unhandledrejection", (e) => {
  console.error("[UNHANDLED PROMISE]", e.reason);
});

window.addEventListener("error", (e) => {
  console.error("[RUNTIME ERROR]", e.error);
});

async function assertBackend() {
  if (import.meta.env.MODE === "test") return;

  const apiBase = import.meta.env.VITE_API_URL;

  if (!apiBase) {
    throw new Error("VITE_API_URL is not set");
  }

  try {
    const res = await fetch(`${apiBase}/health`);
    if (!res.ok) throw new Error();
  } catch {
    throw new Error("Backend is not running on VITE_API_URL");
  }
}

async function bootstrap() {
  if (!validateStartupToken()) return;

  await assertBackend();

  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <BrowserRouter>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </BrowserRouter>
    </React.StrictMode>,
  );
}

void bootstrap();
