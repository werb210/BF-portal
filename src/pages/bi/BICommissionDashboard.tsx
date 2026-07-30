import { useEffect } from "react";
import { useSilo } from "@/hooks/useSilo";
import type { Silo } from "@/types/silo";

export default function BICommissionDashboard() {
  const { silo, setSilo } = useSilo() as { silo: Silo; setSilo: (next: Silo) => void };

  useEffect(() => {
    if (silo !== "bi") {
      setSilo("bi");
    }
  }, [setSilo, silo]);

  // BF_PORTAL_BI_COMMISSIONS_HONEST_EMPTY_v1
  // This page fetched a bi-server commissions endpoint that does not exist -
  // no such route is defined anywhere in that repo.
  // So it rendered an empty <ul> and looked like "no commissions yet" while the
  // request was actually failing. An empty list and a missing endpoint should not
  // look identical. Commission reporting is not built; say so, rather than
  // presenting a blank report that implies the number is zero.
  if (silo !== "bi") return null;

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">BI Commissions</h1>
      <p style={{ color: "var(--ui-text-muted)" }}>
        Commission reporting is not built yet. Referrer commissions are recorded in
        bi_referrer_commissions, but there is no reporting endpoint to read them
        through. This page will stay empty until that is built.
      </p>
    </div>
  );
}
