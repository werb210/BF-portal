import { useCallback, useEffect, useState } from "react";
import apiClient from "@/api/httpClient";
import Button from "@/components/ui/Button";
import ErrorBanner from "@/components/ui/ErrorBanner";
import { getErrorMessage } from "@/utils/errors";

type RuntimeStatus = "green" | "red" | "yellow";

type RuntimeData = {
  api: { label: string; status: RuntimeStatus; detail?: string };
  database: { label: string; status: RuntimeStatus; detail?: string };
  auth: { label: string; status: RuntimeStatus; detail?: string };
};

const defaultRuntimeData: RuntimeData = {
  api: { label: "API health", status: "yellow", detail: "Unknown" },
  database: { label: "Database", status: "yellow", detail: "Unknown" },
  auth: { label: "Auth readiness", status: "yellow", detail: "Unknown" }
};

const RuntimeSettings = () => {
  const [runtime, setRuntime] = useState<RuntimeData>(defaultRuntimeData);
  const [lastChecked, setLastChecked] = useState<string>("");
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  const normalizeStatus = (value: string) => {
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
        apiClient.get<Record<string, unknown>>("/health", { skipAuth: true }),
        apiClient.get<Record<string, unknown>>("/_int/health")
      ]);

      const apiDetail =
        apiHealthResult.status === "fulfilled"
          ? String(apiHealthResult.value?.status ?? apiHealthResult.value?.health ?? "OK")
          : "Error";
      const apiStatus =
        apiHealthResult.status === "fulfilled" ? normalizeStatus(apiDetail) : "red";

      const internalData =
        internalHealthResult.status === "fulfilled" ? internalHealthResult.value : null;
      const dbDetail = String(
        internalData?.database ?? internalData?.db ?? internalData?.dbStatus ?? "Unknown"
      );
      const authDetail = String(
        internalData?.auth ?? internalData?.authStatus ?? internalData?.authReady ?? "Unknown"
      );
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
    } catch (error) {
      setRuntime((prev) => ({
        api: { ...prev.api, status: "red", detail: "Error" },
        database: { ...prev.database, status: "red", detail: "Error" },
        auth: { ...prev.auth, status: "red", detail: "Error" }
      }));
      setLastChecked(new Date().toLocaleTimeString());
      setRuntimeError(getErrorMessage(error, "Unable to load runtime status."));
    } finally {
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

  return (
    <section className="settings-panel" aria-label="Runtime status">
      <header>
        <h2>Runtime verification</h2>
        <p>Read-only checks for API health, database connectivity, and auth readiness.</p>
      </header>
      {runtimeError && <ErrorBanner message={runtimeError} />}

      <div className="runtime-status">
        <div className="runtime-status__row">
          <span className="runtime-status__label">{runtime.api.label}</span>
          <span className={`runtime-status__indicator runtime-status__indicator--${runtime.api.status}`}>
            {runtime.api.detail}
          </span>
        </div>
        <div className="runtime-status__row">
          <span className="runtime-status__label">{runtime.database.label}</span>
          <span className={`runtime-status__indicator runtime-status__indicator--${runtime.database.status}`}>
            {runtime.database.detail}
          </span>
        </div>
        <div className="runtime-status__row">
          <span className="runtime-status__label">{runtime.auth.label}</span>
          <span className={`runtime-status__indicator runtime-status__indicator--${runtime.auth.status}`}>
            {runtime.auth.detail}
          </span>
        </div>
      </div>

      <div className="settings-actions">
        <Button
          type="button"
          variant="secondary"
          onClick={fetchRuntime}
          disabled={isFetching}
          title={isFetching ? "Runtime status is refreshing." : undefined}
        >
          {isFetching ? "Refreshing..." : "Refresh status"}
        </Button>
        {lastChecked && <span className="runtime-status__timestamp">Last checked at {lastChecked}</span>}
      </div>
    </section>
  );
};

export default RuntimeSettings;
