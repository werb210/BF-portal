// BF_PORTAL_BLOCK_v596 - BI commissions, split into CA$ and US$ (a US policy is USD),
// with one CA$ total converted at the same Bank of Canada rate the BF dashboard uses.
import { useCallback, useEffect, useState } from "react";
import { api } from "@/api";
import { useSilo } from "@/hooks/useSilo";
import type { Silo } from "@/types/silo";
import { formatSplit, toCad, type ByCurrency } from "@/utils/currencySplit";

type Money = Record<string, { premium: number; commission: number; count: number }>;
type Row = {
  id: string; business_name: string | null; application_code: string | null; status: string; currency: string;
  annual_premium_amount: string | number | null; commission_amount: string | number | null; created_at: string;
};
type Summary = { byStatus: Record<string, Money>; totals: Money; rows: Row[] };

const STATUSES: Array<[string, string]> = [["estimated", "Estimated"], ["payable", "Payable (premium received)"], ["paid", "Paid to Boreal"]];
const commissionOf = (m: Money | undefined): ByCurrency => ({ CAD: m?.CAD?.commission ?? 0, USD: m?.USD?.commission ?? 0 });
const premiumOf = (m: Money | undefined): ByCurrency => ({ CAD: m?.CAD?.premium ?? 0, USD: m?.USD?.premium ?? 0 });
const money = (cur: string, v: unknown) => `${cur === "USD" ? "US$" : "CA$"}${Math.round(Number(v ?? 0)).toLocaleString()}`;

export default function BICommissionDashboard() {
  const { silo, setSilo } = useSilo() as { silo: Silo; setSilo: (next: Silo) => void };
  const [data, setData] = useState<Summary | null>(null);
  const [fx, setFx] = useState<{ usdToCad: number; asOf: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => { if (silo !== "bi") setSilo("bi"); }, [setSilo, silo]);

  const load = useCallback(async () => {
    try {
      setData(await api<Summary>("/api/v1/bi/commissions/summary"));
      setError(null);
    } catch {
      setError("Could not load BI commissions.");
    }
    try {
      const m = await api<{ fx?: { usdToCad: number; asOf: string | null } | null }>("/api/dashboard/metrics", { headers: { "X-Silo": "BF" } });
      setFx(m?.fx ?? null);
    } catch { setFx(null); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const act = async (id: string, action: "premium-received" | "paid") => {
    setBusyId(id);
    try { await api(`/api/v1/bi/commissions/${id}/${action}`, { method: "POST" }); await load(); }
    catch { setError("That update didn't save. Please try again."); }
    finally { setBusyId(null); }
  };

  if (silo !== "bi") return null;
  const cadLine = (by: ByCurrency) => {
    const total = toCad(by, fx?.usdToCad);
    return total === null ? "CAD total needs today's USD rate" : `= CA$${Math.round(total).toLocaleString()} total`;
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">BI Commissions</h1>
      {error ? <p className="text-red-600">{error}</p> : null}
      {!data ? <p style={{ color: "var(--ui-text-muted)" }}>Loading...</p> : (
        <>
          <div className="grid gap-3 md:grid-cols-4">
            {[...STATUSES, ["all", "All commission"] as [string, string]].map(([key, label]) => {
              const by = commissionOf(key === "all" ? data.totals : data.byStatus[key]);
              return (
                <div key={key} className="drawer-section">
                  <div className="text-sm" style={{ color: "var(--ui-text-muted)" }}>{label}</div>
                  <div className="text-xl font-semibold">{formatSplit(by)}</div>
                  <div className="text-xs" style={{ color: "var(--ui-text-muted)" }}>{cadLine(by)}</div>
                </div>
              );
            })}
          </div>
          <p className="text-sm" style={{ color: "var(--ui-text-muted)" }}>
            Premium volume: {formatSplit(premiumOf(data.totals))} ({cadLine(premiumOf(data.totals)).replace(/^= /, "")}).
            {fx?.usdToCad ? ` US$1 = CA$${fx.usdToCad.toFixed(4)} · Bank of Canada${fx.asOf ? `, ${fx.asOf}` : ""}.` : ""}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left"><th>Business</th><th>Currency</th><th>Annual premium</th><th>Commission</th><th>Status</th><th /></tr>
              </thead>
              <tbody>
                {data.rows.length === 0 ? <tr><td colSpan={6} className="py-3">No BI commissions yet.</td></tr> : data.rows.map((r) => (
                  <tr key={r.id} className="border-t" style={{ borderColor: "var(--ui-border)" }}>
                    <td className="py-2">{r.business_name ?? r.application_code ?? r.id.slice(0, 8)}</td>
                    <td>{r.currency}</td>
                    <td>{money(r.currency, r.annual_premium_amount)}</td>
                    <td>{money(r.currency, r.commission_amount)}</td>
                    <td className="capitalize">{r.status}</td>
                    <td className="text-right">
                      {r.status === "estimated" ? <button type="button" className="text-blue-500" disabled={busyId === r.id} onClick={() => void act(r.id, "premium-received")}>Premium received</button> : null}
                      {r.status === "payable" ? <button type="button" className="text-blue-500" disabled={busyId === r.id} onClick={() => void act(r.id, "paid")}>Mark paid</button> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
