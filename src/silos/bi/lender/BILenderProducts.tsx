// BF_PORTAL_BLOCK_BI_LENDER_PRODUCTS_TAB_v1
// Stub for the BI silo Lender Products sub-tab. Mirrors the BF silo
// LenderProductsPage shape (fetch lender products keyed by lender id,
// render a table per lender) but the BI-Server side does not yet
// expose /api/v1/bi/lender-products. Until that endpoint exists this
// renders a holding card so the tab is not empty. Fetch wiring stays
// commented out so a later block can drop it in without touching the
// surrounding structure.
import { useEffect, useState } from "react";

type BiLender = {
  id: string;
  company_name?: string | null;
};

export default function BILenderProducts() {
  const [lenders, setLenders] = useState<BiLender[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        // Re-uses the existing admin lender list so the table can
        // start showing rows the moment a Products endpoint ships.
        const r = await fetch("/api/v1/bi/admin/lenders", { credentials: "include" });
        if (!r.ok) throw new Error(String(r.status));
        const j = await r.json();
        if (!cancelled) setLenders(Array.isArray(j?.lenders) ? j.lenders : []);
      } catch {
        if (!cancelled) setLenders([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="text-white">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xl font-semibold">Lender Products</h3>
      </div>
      <div className="rounded-lg border border-card bg-brand-surface p-6">
        <p className="text-sm text-white/70">
          Per-lender product catalog. The product surface here will mirror
          BF silo's Lender Products page once the BI server exposes
          /api/v1/bi/lender-products. For now you can see which lenders
          are eligible to receive products.
        </p>
        {loading ? (
          <div className="mt-4 text-sm text-white/40">Loading lenders...</div>
        ) : lenders.length === 0 ? (
          <div className="mt-4 text-sm text-white/40">No lenders provisioned yet. Create one under the Lenders tab.</div>
        ) : (
          <ul className="mt-4 divide-y divide-white/10 text-sm">
            {lenders.map((l) => (
              <li key={l.id} className="py-2 flex items-center justify-between">
                <span className="text-white">{l.company_name || l.id}</span>
                <span className="text-xs text-white/40">products: coming soon</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
