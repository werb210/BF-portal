import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api";
import { retryUnlessClientError } from "@/api/retryPolicy";
import { useSilo } from "@/hooks/useSilo";
import type { Silo } from "@/types/silo";

type BICommissionRow = {
  policyId: string;
  applicationId: string;
  commissionAmount: number;
};

export default function BICommissionDashboard() {
  const { silo, setSilo } = useSilo() as { silo: Silo; setSilo: (next: Silo) => void };

  useEffect(() => {
    if (silo !== "bi") {
      setSilo("bi");
    }
  }, [setSilo, silo]);

  const { data = [] } = useQuery<BICommissionRow[]>({
    queryKey: ["bi", "commissions"],
    queryFn: ({ signal }) => api.getList<BICommissionRow>("/bi/admin/commissions", { signal }),
    enabled: silo === "bi",
    retry: retryUnlessClientError
  });

  if (silo !== "bi") return null;

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">BI Commissions</h1>
      <ul className="list-disc pl-5">
        {data.map((row) => (
          <li key={row.policyId}>{row.policyId} · ${row.commissionAmount.toLocaleString("en-US")}</li>
        ))}
      </ul>
    </div>
  );
}
