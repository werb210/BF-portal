import { useEffect, useState } from "react";
import { fetchClientLenderProducts } from "@api/lenders";

export default function LenderProducts() {
  const [rows, setRows] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetchClientLenderProducts()
      .then(setRows)
      .catch(() => setErr("Failed to load lender products"));
  }, []);

  if (err) return <div role="alert">{err}</div>;

  return (
    <div>
      <h1>Lender Products</h1>
      <table>
        <thead>
          <tr>
            <th>Lender</th>
            <th>Name</th>
            <th>Type</th>
            <th>Min</th>
            <th>Max</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id}>
              <td>{r.lender_name}</td>
              <td>{r.name}</td>
              <td>{r.product_type}</td>
              <td>{r.min_amount ?? "-"}</td>
              <td>{r.max_amount ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
