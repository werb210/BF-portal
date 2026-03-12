import { useEffect, useMemo, useState } from "react";
import { useSilo } from "../../context/SiloContext";
import { createApi } from "../../api/apiFactory";
import { useAuth } from "../../auth/AuthContext";
import type { SLFDeal } from "../../types/slf";

export default function SLFDashboard() {
  const { silo } = useSilo();
  const { token } = useAuth();
  const api = useMemo(() => createApi(silo, token ?? ""), [silo, token]);

  const [deals, setDeals] = useState<SLFDeal[]>([]);

  useEffect(() => {
    async function load() {
      const res = await api.get<SLFDeal[]>("/deals");
      setDeals(res.data);
    }
    void load();
  }, [api]);

  return (
    <div>
      <h2>SLF Deals</h2>
      <pre>{JSON.stringify(deals, null, 2)}</pre>
    </div>
  );
}
