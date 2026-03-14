import { useEffect, useState } from "react";
import { apiClient } from "@/api/apiClient";

type CreditReadiness = {
  industry?: string;
  yearsInBusiness?: string | number;
  monthlyRevenue?: string | number;
  annualRevenue?: string | number;
  arOutstanding?: string | number;
  availableCollateral?: string | number;
  score?: string | number;
};

export default function CreditReadinessPanel({ contactId }: { contactId: string }) {
  const [data, setData] = useState<CreditReadiness | null>(null);

  useEffect(() => {
    apiClient
      .get(`/portal/contacts/${contactId}/credit-readiness`)
      .then((res) => setData(res.data))
      .catch(() => {});
  }, [contactId]);

  if (!data) return <div className="p-4 text-sm text-neutral-500">No credit readiness submitted.</div>;

  return (
    <div className="space-y-3 p-4 text-sm">
      <div><strong>Industry:</strong> {data.industry}</div>
      <div><strong>Years in Business:</strong> {data.yearsInBusiness}</div>
      <div><strong>Monthly Revenue:</strong> {data.monthlyRevenue}</div>
      <div><strong>Annual Revenue:</strong> {data.annualRevenue}</div>
      <div><strong>A/R Outstanding:</strong> {data.arOutstanding}</div>
      <div><strong>Available Collateral:</strong> {data.availableCollateral}</div>
      <div><strong>Preliminary Score:</strong> {data.score}</div>
    </div>
  );
}
