import { useEffect, useMemo, useState } from "react";
import { useSilo } from "../../context/SiloContext";
import { useAuth } from "../../auth/AuthContext";
import { createApi } from "../../api/apiFactory";

type UnderwritingApplication = {
  id: string;
  status: string;
};

export default function BIUnderwriting() {
  const { silo } = useSilo();
  const { token } = useAuth();

  const api = useMemo(() => createApi(silo, token ?? ""), [silo, token]);
  const [apps, setApps] = useState<UnderwritingApplication[]>([]);

  useEffect(() => {
    async function load() {
      const res = await api.get<UnderwritingApplication[]>("/admin/applications");
      setApps(res.data);
    }

    void load();
  }, [api]);

  async function updateStatus(id: string, status: string) {
    await api.patch(`/admin/application/${id}/status`, { status });
    const res = await api.get<UnderwritingApplication[]>("/admin/applications");
    setApps(res.data);
  }

  return (
    <div>
      <h2>BI Underwriting</h2>
      {apps.map((a) => (
        <div key={a.id} style={{ marginBottom: 20 }}>
          <strong>{a.id}</strong>
          <div>Status: {a.status}</div>
          <button onClick={() => updateStatus(a.id, "approved")}>Approve</button>
          <button onClick={() => updateStatus(a.id, "declined")}>Decline</button>
        </div>
      ))}
    </div>
  );
}
