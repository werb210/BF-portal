import { useEffect, useState } from "react";
import { biGetCommissions } from "@api/biClient";

export default function CommissionReport() {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setRows(await biGetCommissions());
  }

  return (
    <div className="max-w-7xl mx-auto px-6">
      <h3 className="text-2xl font-semibold mb-6">Commission Ledger</h3>

      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.id} className="bg-brand-surface border border-card rounded-xl p-4">
            <p>Application: {r.application_id}</p>
            <p>Premium: ${r.annual_premium_amount}</p>
            <p>Commission (10%): ${r.commission_amount}</p>
            <p>Status: {r.status}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
