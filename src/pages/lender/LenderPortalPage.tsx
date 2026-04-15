import { useState } from "react";

type Deal = { id: string; company: string; amount: string; productType: string; stage: string };
type Product = { id: string; name: string; status: "Draft" | "Active" };

const SAMPLE_DEALS: Deal[] = [
  { id: "d-1", company: "Northline Transport", amount: "$350,000", productType: "Equipment", stage: "In Review" },
  { id: "d-2", company: "Blue Harbor Dental", amount: "$180,000", productType: "Working Capital", stage: "Off to Lender" }
];

export default function LenderPortalPage() {
  const [products, setProducts] = useState<Product[]>([
    { id: "p1", name: "SBA Line", status: "Active" },
    { id: "p2", name: "Equipment Bridge", status: "Draft" }
  ]);
  const [newProduct, setNewProduct] = useState("");

  return (
    <div className="page space-y-4">
      <h1 className="text-2xl font-semibold">Lender Portal</h1>

      <section className="drawer-section">
        <div className="drawer-section__title">Deals</div>
        <div className="space-y-2">
          {SAMPLE_DEALS.map((deal) => (
            <article key={deal.id} className="rounded border p-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{deal.company}</div>
                <div className="text-sm">{deal.amount} • {deal.productType} • {deal.stage}</div>
              </div>
              <button className="ui-button ui-button--secondary">Upload Term Sheet</button>
            </article>
          ))}
        </div>
      </section>

      <section className="drawer-section">
        <div className="drawer-section__title">Products</div>
        <div className="flex gap-2 mb-2">
          <input className="border rounded p-2 flex-1" value={newProduct} onChange={(e) => setNewProduct(e.target.value)} placeholder="New product" />
          <button
            className="ui-button ui-button--primary"
            onClick={() => {
              if (!newProduct.trim()) return;
              setProducts((prev) => [...prev, { id: `p-${Date.now()}`, name: newProduct.trim(), status: "Draft" }]);
              setNewProduct("");
            }}
          >
            Add
          </button>
        </div>
        <div className="space-y-2">
          {products.map((product) => (
            <div key={product.id} className="rounded border p-2 flex items-center justify-between">
              <span>{product.name}</span>
              <button
                className="ui-button ui-button--secondary"
                onClick={() => setProducts((prev) => prev.map((item) => item.id === product.id ? { ...item, status: item.status === "Draft" ? "Active" : "Draft" } : item))}
              >
                {product.status}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
