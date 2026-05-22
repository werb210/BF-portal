// BF_PORTAL_BLOCK_BI_LENDER_PRODUCTS_TAB_v1
import { useEffect, useState } from "react";
import { api } from "@/api";

type BiLenderProduct = {
  id: string;
  lender_name?: string | null;
  lender_company_name?: string | null;
  country?: string | null;
  amount_low?: number | string | null;
  amount_high?: number | string | null;
  active?: boolean | null;
  is_active?: boolean | null;
};

function money(value: BiLenderProduct["amount_low"]) {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return String(value);
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);
}

// v187: companion row component for the Lender Products list. Renders
// lender name + amount range + country + active + edit.
type LenderProductRowV187 = {
  product: BiLenderProduct;
  onEdit: (id: string) => void;
};

export function LenderProductRowV187({ product, onEdit }: LenderProductRowV187) {
  return (
    <tr className="border-t border-white/10">
      <td className="px-3 py-2">{product.lender_name ?? product.lender_company_name ?? "—"}</td>
      <td className="px-3 py-2">{`${money(product.amount_low)} – ${money(product.amount_high)}`}</td>
      <td className="px-3 py-2">{product.country ?? "—"}</td>
      <td className="px-3 py-2">{(product.active ?? product.is_active) === false ? "No" : "Yes"}</td>
      <td className="px-3 py-2">
        <button
          type="button"
          className="rounded border border-white/20 px-2 py-1 text-xs hover:bg-white/10"
          onClick={() => onEdit(product.id)}
        >
          Edit
        </button>
      </td>
    </tr>
  );
}

export default function BILenderProducts() {
  const [products, setProducts] = useState<BiLenderProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const openEditModal = (id: string) => {
    // placeholder edit action; wire to modal when available.
    void id;
  };

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
              <th className="px-3 py-2">Lender name</th>
              <th className="px-3 py-2">Amount range</th>
              <th className="px-3 py-2">Country</th>
              <th className="px-3 py-2">Active</th>
              <th className="px-3 py-2">Edit</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-3 py-4 text-white/40" colSpan={5}>Loading products...</td></tr>
            ) : products.length === 0 ? (
              <tr><td className="px-3 py-4 text-white/40" colSpan={5}>No lender products found.</td></tr>
            ) : products.map((p) => (
              <LenderProductRowV187 key={p.id} product={p} onEdit={openEditModal} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
