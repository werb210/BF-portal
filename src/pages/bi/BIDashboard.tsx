import { useEffect, useMemo, useState } from "react";
import { useSilo } from "../../context/SiloContext";
import { createApi } from "../../api/apiFactory";
import { useAuth } from "../../auth/AuthContext";

export default function BIDashboard() {
  const { silo } = useSilo();
  const { token } = useAuth();
  const api = useMemo(() => createApi(silo, token ?? ""), [silo, token]);

  const [applications, setApplications] = useState([]);
  const [commissions, setCommissions] = useState([]);

  useEffect(() => {
    async function load() {
      const apps = await api.get("/admin/applications");
      const { data } = await api.get("/admin/commissions");

      setApplications(apps.data);
      setCommissions(data);
    }
    void load();
  }, [api]);

  return (
    <div>
      <h2>BI Applications</h2>
      <pre>{JSON.stringify(applications, null, 2)}</pre>

      <h2>BI Commissions</h2>
      <pre>{JSON.stringify(commissions, null, 2)}</pre>
    </div>
  );
}
