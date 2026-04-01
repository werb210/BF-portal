import { useEffect, useState } from "react";
import api from "@/core/apiClient";

type MayaMetricsData = {
  confidenceAverage?: number;
  driftScore?: number;
  leadConversionRate?: number;
  systemUptime?: string;
};

export default function MayaMetrics() {
  const [metrics, setMetrics] = useState<MayaMetricsData>({});

  useEffect(() => {
    api.get("/api/maya/metrics").then((result) => {
      setMetrics((result as MayaMetricsData) ?? {});
    });
  }, []);

  return (
    <div className="space-y-2 rounded border border-slate-200 p-4">
      <h2 className="text-lg font-semibold">Observability</h2>
      <div>ML confidence averages: {metrics.confidenceAverage ?? "—"}</div>
      <div>Drift score: {metrics.driftScore ?? "—"}</div>
      <div>Lead conversion rate: {metrics.leadConversionRate ?? "—"}</div>
      <div>System uptime: {metrics.systemUptime ?? "—"}</div>
    </div>
  );
}
