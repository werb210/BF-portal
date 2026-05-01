import { useMemo, useState } from "react";
import SiloSelector from "../../components/SiloSelector";
import { api } from "@/api";
import { __apiBaseUrls } from "@/config/api";
import { useSilo } from "../../context/SiloContext";
import { useAuth } from "../../auth/AuthContext";

export default function BFDashboard() {
  const { silo } = useSilo();
  const { token } = useAuth();
  // BF_PORTAL_BLOCK_1_19 — active-silo api directly from @/api.
  const [status, setStatus] = useState("Idle");

  return (
    <div>
      <h2>BF Dashboard</h2>
      <SiloSelector />
      <p>Current silo: {silo.toUpperCase()}</p>
      <button
        onClick={() => {
          setStatus(`API base: ${__apiBaseUrls.bf}`);
        }}
      >
        Show API Base
      </button>
      <pre>{status}</pre>
    </div>
  );
}
