import { useEffect, useState } from "react";
import { api as api } from "@/api";

export default function MayaStatus() {
  const [status, setStatus] = useState<string>("degraded");

  useEffect(() => {
    void api
      .get("/api/health")
      .then((res) => {
        // res is the unwrapped `data` object from /api/health.
        // The server places `maya` inside `data` so it survives parsePayload.
        setStatus((res as { maya?: string })?.maya ?? "degraded");
      })
      .catch(() => {
        // swallow health-check failures (non-blocking)
      });
  }, []);

  const healthy = status === "healthy" || status === "ok";

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold text-white ${
        healthy ? "bg-emerald-600" : "bg-red-600"
      }`}
    >
      Maya: {healthy ? "Healthy" : "Degraded"}
    </span>
  );
}
