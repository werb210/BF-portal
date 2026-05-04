// BF_PORTAL_BLOCK_v89_LENDER_SPA_v1
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { lenderApi, type LenderApp } from "@/api/lenderApi";

export default function LenderApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [app, setApp] = useState<LenderApp | null>(null);

  useEffect(() => {
    if (!id) return;
    lenderApi.application(id).then(setApp);
  }, [id]);

  if (!app) return <div>Loading…</div>;
  return <div><Link to="/lender-portal/applications">← Back to applications</Link><h1>{app.id}</h1></div>;
}
