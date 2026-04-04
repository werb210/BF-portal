import { jsx as _jsx } from "react/jsx-runtime";
import "@/lib/authSync";
import "@/lib/networkGuard";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { validateStartupToken } from "@/bootstrap";
import { api } from "@/api";
import { getSilo } from "./lib/silo";
import { ErrorBoundary } from "./components/ErrorBoundary";
import App from "./App";
import "./index.css";
window.__SILO__ = getSilo();
window.addEventListener("unhandledrejection", (e) => {
    console.error("❌ UNHANDLED PROMISE:", e.reason);
});
window.addEventListener("error", (e) => {
    console.error("❌ RUNTIME ERROR:", e.error);
});
console.log("🔥 PORTAL BOOT");
console.log("🧠 ACTIVE SILO:", window.__SILO__);
async function assertBackend() {
    const mode = import.meta.env.MODE;
    if (mode === "test" || mode === "production")
        return;
    await api("/health", {
        headers: { "x-skip-auth": "true" },
    });
}
async function bootstrap() {
    if (!validateStartupToken())
        return;
    await assertBackend();
    ReactDOM.createRoot(document.getElementById("root")).render(_jsx(React.StrictMode, { children: _jsx(BrowserRouter, { children: _jsx(ErrorBoundary, { children: _jsx(App, {}) }) }) }));
}
void bootstrap();
