import { useEffect, useState } from "react";
import { api as api } from "@/api";

type MayaHealthResponse = {
  ok?: boolean;
  agent_status?: number;
};

export default function MayaStatus() {
  const [healthy, setHealthy] = useState<boolean>(false);

  useEffect(() => {
    void api
      .get("/api/maya/health")
      .then((res) => {
        const mayaHealth = res as MayaHealthResponse;
        setHealthy(mayaHealth.ok === true && mayaHealth.agent_status === 200);
      })
      .catch(() => {
        // swallow health-check failures (non-blocking)
      });
  }, []);

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
