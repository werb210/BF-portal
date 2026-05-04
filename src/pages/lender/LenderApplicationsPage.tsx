// BF_PORTAL_BLOCK_v89_LENDER_SPA_v1
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { lenderApi, type LenderApp } from "@/api/lenderApi";

export default function LenderApplicationsPage() {
  const [apps, setApps] = useState<LenderApp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    lenderApi.applications().then((r) => setApps(r.items ?? [])).finally(() => setLoading(false));
  }, []);

  return <div><h1>Applications</h1>{loading ? <p>Loading…</p> : apps.map(a => <Link key={a.id} to={`/lender-portal/applications/${a.id}`}>{a.id}</Link>)}</div>;
}
