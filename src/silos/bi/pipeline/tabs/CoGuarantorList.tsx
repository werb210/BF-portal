// BF_PORTAL_BLOCK_v629_BI_PURBECK_RENDER_v1
import { useEffect, useState } from "react";
import { apiForSilo } from "@/api";

type CoGuarantor = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  date_of_birth: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  relationship: string;
};

export function CoGuarantorList({ applicationId, hasCoGuarantors }: { applicationId: string; hasCoGuarantors: boolean }) {
  const [items, setItems] = useState<CoGuarantor[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      try {
        const biApi = apiForSilo("BI");
        const body = await biApi<{ co_guarantors?: CoGuarantor[] }>(
          `/api/v1/bi/applications/${applicationId}/co-guarantors`,
        );
        if (!cancel) setItems(body?.co_guarantors || []);
      } catch (_) {
        // non-blocking
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [applicationId]);

  if (!hasCoGuarantors && items.length === 0) return null;

  return (
    <section className="rounded border border-blue-200 bg-blue-50 p-3">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold text-blue-900">Co-guarantors</h3>
        <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800">
          Carrier requires separate intake — contact applicant
        </span>
      </div>
      {loading && <p className="text-sm text-gray-500">Loading…</p>}
      {!loading && items.length === 0 && <p className="text-sm text-gray-700">Applicant indicated co-guarantors but none recorded yet.</p>}
      {items.map((cg) => (
        <div key={cg.id} className="mt-2 p-2 rounded bg-white border border-blue-100 text-sm">
          <div className="flex justify-between">
            <strong>{cg.first_name} {cg.last_name}</strong>
            <span className="text-gray-600">{cg.relationship}</span>
          </div>
          <div className="text-gray-700">{cg.email} · {cg.phone}</div>
          <div className="text-gray-600 text-xs">{cg.address}, {cg.city}, {cg.province} {cg.postal_code} · DOB {cg.date_of_birth}</div>
        </div>
      ))}
    </section>
  );
}
