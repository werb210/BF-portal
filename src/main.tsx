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
  const mode = import.meta.env.MODE;

  if (mode === "test" || mode === "production") return;

  const base = import.meta.env.VITE_API_URL;
  const res = await fetch(`${base}/health`);

  if (!res.ok) {
    throw new Error("Backend not reachable");
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
