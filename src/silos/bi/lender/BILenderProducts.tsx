// BF_PORTAL_BLOCK_BI_LENDER_PRODUCTS_TAB_v1
import { useEffect, useState } from "react";
import { api } from "@/api";

type BiLenderProduct = {
  id: string;
  product_name?: string | null;
  name?: string | null;
  lender_name?: string | null;
  lender_company_name?: string | null;
  amount_low?: number | string | null;
  amount_high?: number | string | null;
  interest_rate?: number | string | null;
  rate?: number | string | null;
  active?: boolean | null;
  is_active?: boolean | null;
};

function money(value: BiLenderProduct["amount_low"]) {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return String(value);
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);
}

function rate(value: BiLenderProduct["interest_rate"]) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string") return value;
  return `${value}%`;
}

export default function BILenderProducts() {
  const [products, setProducts] = useState<BiLenderProduct[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const r = await api<{ products?: BiLenderProduct[]; lender_products?: BiLenderProduct[] }>("/api/v1/bi/lender-products?include_lender=true");
        if (!cancelled) setProducts(Array.isArray(r.products) ? r.products : Array.isArray(r.lender_products) ? r.lender_products : []);
      } catch {
        if (!cancelled) setProducts([]);
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
      <div className="overflow-x-auto rounded-lg border border-card bg-brand-surface">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-white/50">
            <tr>
              <th className="px-3 py-2">Product name</th>
              <th className="px-3 py-2">Lender name</th>
              <th className="px-3 py-2">Amount Low</th>
              <th className="px-3 py-2">Amount High</th>
              <th className="px-3 py-2">Interest rate</th>
              <th className="px-3 py-2">Active</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-3 py-4 text-white/40" colSpan={6}>Loading products...</td></tr>
            ) : products.length === 0 ? (
              <tr><td className="px-3 py-4 text-white/40" colSpan={6}>No lender products found.</td></tr>
            ) : products.map((p) => (
              <tr key={p.id} className="border-t border-white/10">
                <td className="px-3 py-2">{p.product_name ?? p.name ?? "—"}</td>
                <td className="px-3 py-2">{p.lender_name ?? p.lender_company_name ?? "—"}</td>
                <td className="px-3 py-2">{money(p.amount_low)}</td>
                <td className="px-3 py-2">{money(p.amount_high)}</td>
                <td className="px-3 py-2">{rate(p.interest_rate ?? p.rate)}</td>
                <td className="px-3 py-2">{(p.active ?? p.is_active) === false ? "No" : "Yes"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
