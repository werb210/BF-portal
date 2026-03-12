import { useMemo, useState } from "react";
import SiloSelector from "../../components/SiloSelector";
import { createApi } from "../../api/apiFactory";
import { useSilo } from "../../context/SiloContext";
import { useAuth } from "../../auth/AuthContext";

export default function BFDashboard() {
  const { silo } = useSilo();
  const { token } = useAuth();
  const api = useMemo(() => createApi(silo, token ?? ""), [silo, token]);
  const [status, setStatus] = useState("Idle");

  return (
    <div>
      <h2>BF Dashboard</h2>
      <SiloSelector />
      <p>Current silo: {silo.toUpperCase()}</p>
      <button
        onClick={() => {
          setStatus(`API base: ${api.defaults.baseURL ?? "unknown"}`);
        }}
      >
        Show API Base
      </button>
      <pre>{status}</pre>
    </div>
  );
}
