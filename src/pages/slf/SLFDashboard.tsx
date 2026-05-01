import { useEffect, useMemo, useState } from "react";
import { useSilo } from "../../context/SiloContext";
import { api } from "@/api";
import { useAuth } from "../../auth/AuthContext";
import type { SLFDeal } from "../../types/slf";

export default function SLFDashboard() {
  const { silo } = useSilo();
  const { token } = useAuth();
  // BF_PORTAL_BLOCK_1_19 — active-silo api directly from @/api.

  const [deals, setDeals] = useState<SLFDeal[]>([]);

  useEffect(() => {
    async function load() {
      const res = await api.get<SLFDeal[]>("/deals");
      setDeals(res);
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
