// BF_PORTAL_BLOCK_v89_LENDER_SPA_v1
import { useEffect, useState } from "react";
import { lenderApi, type LenderApp } from "@/api/lenderApi";

export default function LenderDashboardPage() {
  const [apps, setApps] = useState<LenderApp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    lenderApi.applications().then((r) => setApps(r.items ?? [])).finally(() => setLoading(false));
  }, []);

  const counts = apps.reduce((acc, a) => { acc[a.status] = (acc[a.status] ?? 0) + 1; return acc; }, {} as Record<string, number>);

  return <div><h1>Dashboard</h1>{loading && <p>Loading…</p>}</div>;
}
