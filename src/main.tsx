import "@/lib/networkGuard"
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { checkBackend, validateStartupToken } from "@/bootstrap";

import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";

const t = localStorage.getItem("token")
if (t === "null" || t === "undefined") {
  localStorage.removeItem("token")
}

window.addEventListener("unhandledrejection", (e) => {
  console.error("[UNHANDLED PROMISE]", e.reason);
});

window.addEventListener("error", (e) => {
  console.error("[RUNTIME ERROR]", e.error);
});

async function bootstrap() {
  if (!validateStartupToken()) return;

  const ok = await checkBackend();

  if (!ok) {
    document.body.innerHTML = "<h1>Backend unavailable</h1>";
    throw new Error("Backend unreachable");
  }

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
