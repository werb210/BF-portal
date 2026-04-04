import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from "react";
import api from "@/api";
import Button from "@/components/ui/Button";
import ErrorBanner from "@/components/ui/ErrorBanner";
import { getErrorMessage } from "@/utils/errors";
const defaultRuntimeData = {
    api: { label: "API health", status: "yellow", detail: "Unknown" },
    database: { label: "Database", status: "yellow", detail: "Unknown" },
    auth: { label: "Auth readiness", status: "yellow", detail: "Unknown" }
};
const RuntimeSettings = () => {
    const [runtime, setRuntime] = useState(defaultRuntimeData);
    const [lastChecked, setLastChecked] = useState("");
    const [runtimeError, setRuntimeError] = useState(null);
    const [isFetching, setIsFetching] = useState(false);
    const normalizeStatus = (value) => {
        const normalized = value.toLowerCase();
        if (["ok", "healthy", "green", "pass"].some((token) => normalized.includes(token))) {
            return "green";
        }
        if (["warn", "degraded", "yellow"].some((token) => normalized.includes(token))) {
            return "yellow";
        }
        if (["fail", "error", "red"].some((token) => normalized.includes(token))) {
            return "red";
        }
        return "yellow";
    };
    const fetchRuntime = useCallback(async () => {
        setIsFetching(true);
        setRuntimeError(null);
        try {
            const [apiHealthResult, internalHealthResult] = await Promise.allSettled([
                api.get("/api/health"),
                api.get("/api/_int/health")
            ]);
            const apiDetail = apiHealthResult.status === "fulfilled"
                ? String(apiHealthResult.value?.status ?? apiHealthResult.value?.health ?? "OK")
                : "Error";
            const apiStatus = apiHealthResult.status === "fulfilled" ? normalizeStatus(apiDetail) : "red";
            const internalData = internalHealthResult.status === "fulfilled" ? internalHealthResult.value : null;
            const dbDetail = String(internalData?.database ?? internalData?.db ?? internalData?.dbStatus ?? "Unknown");
            const authDetail = String(internalData?.auth ?? internalData?.authStatus ?? internalData?.authReady ?? "Unknown");
            const databaseStatus = internalData
                ? normalizeStatus(dbDetail)
                : internalHealthResult.status === "rejected"
                    ? "red"
                    : "yellow";
            const authStatus = internalData
                ? normalizeStatus(authDetail)
                : internalHealthResult.status === "rejected"
                    ? "red"
                    : "yellow";
            setRuntime({
                api: { label: "API health", status: apiStatus, detail: apiDetail },
                database: { label: "DB connection", status: databaseStatus, detail: dbDetail },
                auth: { label: "Auth readiness", status: authStatus, detail: authDetail }
            });
            setLastChecked(new Date().toLocaleTimeString());
        }
        catch (error) {
            setRuntime((prev) => ({
                api: { ...prev.api, status: "red", detail: "Error" },
                database: { ...prev.database, status: "red", detail: "Error" },
                auth: { ...prev.auth, status: "red", detail: "Error" }
            }));
            setLastChecked(new Date().toLocaleTimeString());
            setRuntimeError(getErrorMessage(error, "Unable to load runtime status."));
        }
        finally {
            setIsFetching(false);
        }
    }, []);
    useEffect(() => {
        void fetchRuntime();
        const interval = window.setInterval(() => {
            void fetchRuntime();
        }, 30000);
        return () => window.clearInterval(interval);
    }, [fetchRuntime]);
    return (_jsxs("section", { className: "settings-panel", "aria-label": "Runtime status", children: [_jsxs("header", { children: [_jsx("h2", { children: "Runtime verification" }), _jsx("p", { children: "Read-only checks for API health, database connectivity, and auth readiness." })] }), runtimeError && _jsx(ErrorBanner, { message: runtimeError }), _jsxs("div", { className: "runtime-status", children: [_jsxs("div", { className: "runtime-status__row", children: [_jsx("span", { className: "runtime-status__label", children: runtime.api.label }), _jsx("span", { className: `runtime-status__indicator runtime-status__indicator--${runtime.api.status}`, children: runtime.api.detail })] }), _jsxs("div", { className: "runtime-status__row", children: [_jsx("span", { className: "runtime-status__label", children: runtime.database.label }), _jsx("span", { className: `runtime-status__indicator runtime-status__indicator--${runtime.database.status}`, children: runtime.database.detail })] }), _jsxs("div", { className: "runtime-status__row", children: [_jsx("span", { className: "runtime-status__label", children: runtime.auth.label }), _jsx("span", { className: `runtime-status__indicator runtime-status__indicator--${runtime.auth.status}`, children: runtime.auth.detail })] })] }), _jsxs("div", { className: "settings-actions", children: [_jsx(Button, { type: "button", variant: "secondary", onClick: fetchRuntime, disabled: isFetching, title: isFetching ? "Runtime status is refreshing." : undefined, children: isFetching ? "Refreshing..." : "Refresh status" }), lastChecked && _jsxs("span", { className: "runtime-status__timestamp", children: ["Last checked at ", lastChecked] })] })] }));
};
export default RuntimeSettings;
