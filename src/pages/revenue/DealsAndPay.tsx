// BF_PORTAL_v942_DEALS_AND_PAY - Revenue > Deals and pay (Todd, Nov 11 2026): every closed deal and each way it pays us,
// expected vs received, clawbacks and referral fees owed; and the broker pay statements. "In the revenue tab a broker
// sees only their numbers. an admin (brokerage owner) sees their numbers and all others." The server enforces it; an
// Admin can pick one broker or see everyone.
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { api } from "@/api";
import { getErrorMessage } from "@/utils/errors";

type Close = { id: string; application_id: string; closed_on: string; currency: string; funded_amount: number; lender_name: string | null; broker_user_id: string | null; broker_name: string | null; business: string | null; status: string };
type Line = { id: string; close_id: string; kind: string; description: string | null; expected_amount: number | null; received_amount: number | null; received_on: string | null; month: string | null; status: string };
type Totals = { funded?: number; expected?: number; received?: number; outstanding?: number; clawed_back?: number; referral_owed?: number };
type StLine = { kind: string; text: string; amount: number };
type Statement = { user_id: string; pay_date: string; window: { from: string; to: string }; net_revenue: number; funded_volume: number; deals: number; rate_pct: number; lines: StLine[]; total: number; draw_balance_after: number };
type Person = { id: string; name: string };

const card: CSSProperties = { background: "var(--ui-surface)", border: "1px solid var(--ui-border)", borderRadius: 12, padding: 16, marginBottom: 16 };
const th: CSSProperties = { textAlign: "left", padding: "6px 8px", fontSize: 11, color: "var(--ui-text-muted)", borderBottom: "1px solid var(--ui-border)", whiteSpace: "nowrap" };
const td: CSSProperties = { padding: "6px 8px", borderBottom: "1px solid var(--ui-border)", fontSize: 13, verticalAlign: "top" };
const inp: CSSProperties = { padding: "6px 8px", borderRadius: 8, border: "1px solid var(--ui-border)", background: "var(--ui-surface)", color: "var(--ui-text)", fontSize: 13 };
const money = (n: number | null | undefined, cur = "CAD") => (n === null || n === undefined || !Number.isFinite(n) ? "—" : n.toLocaleString("en-CA", { style: "currency", currency: cur, maximumFractionDigits: 0 }));
const KIND: Record<string, string> = { lender_commission: "Lender commission", residual: "Profit share", client_fee: "Broker fee", setup_fee: "Set-up fee", proceeds_fee: "Fee from proceeds", spread: "Rate difference", referral_fee: "Referral fee owed", other: "Other" };

function Tile({ label, value }: { label: string; value: string }) {
  return <div style={{ minWidth: 140 }}><div style={{ fontSize: 11, color: "var(--ui-text-muted)", textTransform: "uppercase", letterSpacing: ".04em" }}>{label}</div><div style={{ fontSize: 18, fontWeight: 700 }}>{value}</div></div>;
}

export default function DealsAndPay({ isAdmin }: { isAdmin: boolean }) {
  const year = new Date().getFullYear();
  const [from, setFrom] = useState(`${year}-01-01`);
  const [to, setTo] = useState(`${year}-12-31`);
  const [broker, setBroker] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [data, setData] = useState<{ closes: Close[]; lines: Line[]; totals: Totals; scope: string } | null>(null);
  const [statements, setStatements] = useState<Statement[] | null>(null);
  const [payDate, setPayDate] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    api.get<{ people?: Person[] }>("/api/deals/pay-settings").then((r) => setPeople(r?.people ?? [])).catch(() => setPeople([]));
  }, [isAdmin]);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const q = new URLSearchParams({ from, to, ...(isAdmin && broker ? { broker } : {}) });
      setData(await api.get(`/api/deals/revenue?${q.toString()}`));
      const s = await api.get<{ statements?: Statement[]; pay_date?: string }>(`/api/deals/statements?${new URLSearchParams({ ...(payDate ? { pay_date: payDate } : {}), ...(isAdmin && broker ? { user: broker } : {}) }).toString()}`);
      setStatements(s?.statements ?? []);
      if (!payDate && s?.pay_date) setPayDate(s.pay_date);
    } catch (e) { setErr(getErrorMessage(e, "Revenue could not be loaded.")); }
  }, [from, to, broker, isAdmin, payDate]);
  useEffect(() => { void load(); }, [load]);

  const name = (id: string) => people.find((p) => p.id === id)?.name ?? (isAdmin ? "Broker" : "You");
  const t = data?.totals ?? {};
  return (
    <div data-testid="deals-and-pay">
      <section style={card}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
          <label style={{ fontSize: 12 }}>From<br /><input aria-label="From" type="date" style={inp} value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label style={{ fontSize: 12 }}>To<br /><input aria-label="To" type="date" style={inp} value={to} onChange={(e) => setTo(e.target.value)} /></label>
          {isAdmin ? (
            <label style={{ fontSize: 12 }}>Broker<br />
              <select aria-label="Broker" style={inp} value={broker} onChange={(e) => setBroker(e.target.value)}>
                <option value="">Everyone</option>
                {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
          ) : <span style={{ fontSize: 13, color: "var(--ui-text-muted)" }}>Your deals and pay only.</span>}
        </div>
        {err ? <p role="alert" style={{ color: "#b91c1c", fontSize: 13 }}>{err}</p> : null}
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginTop: 14 }}>
          <Tile label="Funded" value={money(t.funded)} />
          <Tile label="Revenue expected" value={money(t.expected)} />
          <Tile label="Received" value={money(t.received)} />
          <Tile label="Still owed to us" value={money(t.outstanding)} />
          <Tile label="Clawed back" value={money(t.clawed_back)} />
          <Tile label="Referral fees owed" value={money(t.referral_owed)} />
        </div>
      </section>

      <section style={card}>
        <h2 style={{ fontSize: 15, margin: "0 0 10px" }}>Closed deals</h2>
        {!data ? <p style={{ fontSize: 13 }}>Loading…</p> : data.closes.length === 0 ? <p style={{ fontSize: 13, color: "var(--ui-text-muted)" }} data-testid="deals-empty">No closed deals in these dates.</p> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>{["Closed", "Business", "Lender", "Funded", ...(isAdmin ? ["Broker"] : []), "Revenue lines"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {data.closes.map((c) => (
                  <tr key={c.id} data-testid={`deal-${c.id}`}>
                    <td style={td}>{c.closed_on}</td>
                    <td style={td}><Link to={`/applications/${c.application_id}/close`}>{c.business ?? "Deal"}</Link>{c.status === "clawed_back" ? <div style={{ color: "#b91c1c", fontSize: 11 }}>Clawed back</div> : null}</td>
                    <td style={td}>{c.lender_name ?? "—"}</td>
                    <td style={td}>{money(c.funded_amount, c.currency)}</td>
                    {isAdmin ? <td style={td}>{c.broker_name ?? "—"}</td> : null}
                    <td style={td}>
                      {data.lines.filter((l) => l.close_id === c.id).map((l) => (
                        <div key={l.id} style={{ whiteSpace: "nowrap" }}>
                          {KIND[l.kind] ?? l.kind}{l.month ? ` ${l.month.slice(0, 7)}` : ""}: {l.kind === "referral_fee" ? "−" : ""}{money(l.status === "received" ? l.received_amount : l.expected_amount, c.currency)}{" "}
                          <span style={{ color: l.status === "received" ? "#166534" : l.status === "clawed_back" ? "#b91c1c" : "var(--ui-text-muted)" }}>({l.status === "received" ? `received ${l.received_on}` : l.status === "clawed_back" ? "clawed back" : "expected"})</span>
                        </div>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={card} data-testid="pay-statements">
        <div style={{ display: "flex", gap: 10, alignItems: "end", flexWrap: "wrap" }}>
          <h2 style={{ fontSize: 15, margin: 0 }}>Pay statement{isAdmin && !broker ? "s" : ""}</h2>
          <label style={{ fontSize: 12 }}>Pay date<br /><input aria-label="Pay date" type="date" style={inp} value={payDate} onChange={(e) => setPayDate(e.target.value)} /></label>
        </div>
        {statements === null ? <p style={{ fontSize: 13 }}>Loading…</p> : statements.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--ui-text-muted)" }}>{isAdmin ? "No broker pay plans yet. Set them in Settings > Money > Broker pay." : "No pay statement for this date."}</p>
        ) : statements.map((s) => (
          <div key={`${s.user_id}-${s.pay_date}`} style={{ borderTop: "1px solid var(--ui-border)", paddingTop: 10, marginTop: 10 }} data-testid={`statement-${s.user_id}`}>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13 }}>
              <strong>{isAdmin ? name(s.user_id) : "Your pay"}</strong>
              <span>Paid {s.pay_date} for money received {s.window.from} to {s.window.to}</span>
              <span>Revenue {money(s.net_revenue)} · {s.deals} deal{s.deals === 1 ? "" : "s"} funded · {s.rate_pct}%</span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 6 }}>
              <tbody>
                {s.lines.map((l, i) => <tr key={i}><td style={td}>{l.text}</td><td style={{ ...td, textAlign: "right", color: l.amount < 0 ? "#b91c1c" : undefined }}>{money(l.amount)}</td></tr>)}
                <tr><td style={{ ...td, fontWeight: 700 }}>Total</td><td style={{ ...td, textAlign: "right", fontWeight: 700 }} data-testid={`statement-total-${s.user_id}`}>{money(s.total)}</td></tr>
              </tbody>
            </table>
            {s.draw_balance_after > 0 ? <p style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>Draw still to recover: {money(s.draw_balance_after)}</p> : null}
          </div>
        ))}
      </section>
    </div>
  );
}
