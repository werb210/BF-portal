// BF_PORTAL_v867_BROKER_TOOLS_CREDIT_LINES - Deal desk > Approved credit lines: the client's lines (lender, limit, used, available,
// expiry, conditions), draws and repayments, and which line this deal draws on when it funds.
import { useCallback, useEffect, useState } from "react";
import { api } from "@/api";
import { Chip, ErrorLine, card, h3, input, label, money, muted, primaryButton, row, secondaryButton, table, td, th } from "./ui";
import { useRun } from "./useRun";

export type Draw = { id: string; kind: "draw" | "repayment"; source: string; amount: number; drawn_on: string; note: string | null; reversed: boolean };
export type CreditLine = {
  id: string; lender_name: string | null; product_name: string | null; limit_amount: number; used: number; available: number; currency: string;
  approved_on: string | null; expiry_date: string | null; conditions: string | null; status: "active" | "expired" | "closed";
  days_to_expiry: number | null; expiring_soon: boolean; over_limit: boolean; draws: Draw[]; company_name?: string | null;
};

/** "Expires in 12 days", "Expired", "Closed", "No expiry". */
export function expiryText(l: Pick<CreditLine, "status" | "expiry_date" | "days_to_expiry">): string {
  if (l.status === "closed") return "Closed";
  if (l.status === "expired") return `Expired ${l.expiry_date ?? ""}`.trim();
  if (l.days_to_expiry === null) return "No expiry";
  return l.days_to_expiry === 0 ? "Expires today" : `Expires in ${l.days_to_expiry} day${l.days_to_expiry === 1 ? "" : "s"} (${l.expiry_date})`;
}

export function LineChip({ l }: { l: CreditLine }) {
  if (l.status !== "active") return <Chip tone="grey">{l.status === "closed" ? "Closed" : "Expired"}</Chip>;
  if (l.over_limit) return <Chip tone="red">Over limit</Chip>;
  return l.expiring_soon ? <Chip tone="amber">Expiring soon</Chip> : <Chip tone="green">Active</Chip>;
}

const blank = { lender_name: "", product_name: "", limit_amount: "", approved_on: "", expiry_date: "", conditions: "", reminder_days: "30" };

export default function CreditLinesPanel({ applicationId }: { applicationId: string }) {
  const base = `/api/deal-desk/applications/${encodeURIComponent(applicationId)}`;
  const [lines, setLines] = useState<CreditLine[] | null>(null);
  const [linked, setLinked] = useState<string | null>(null);
  const [form, setForm] = useState(blank);
  const [draw, setDraw] = useState<Record<string, { amount: string; kind: string; note: string }>>({});
  const load = useCallback(async () => {
    const r = await api.get<{ lines: CreditLine[]; linked_line_id: string | null }>(`${base}/credit-lines`).catch(() => null);
    setLines(Array.isArray(r?.lines) ? r!.lines : []);
    setLinked(r?.linked_line_id ?? null);
  }, [base]);
  const { busy, err, msg, run } = useRun(load);
  useEffect(() => { void load(); }, [load]);

  const add = () => run(async () => {
    await api.post(`${base}/credit-lines`, { ...form, approved_on: form.approved_on || null, expiry_date: form.expiry_date || null });
    setForm(blank);
  }, "Credit line recorded.");
  const record = (l: CreditLine) => run(async () => {
    const d = draw[l.id] ?? { amount: "", kind: "draw", note: "" };
    await api.post(`/api/deal-desk/credit-lines/${l.id}/draws`, { ...d, application_id: applicationId });
    setDraw((x) => ({ ...x, [l.id]: { amount: "", kind: "draw", note: "" } }));
  }, "Recorded.");

  return (
    <section style={card} data-testid="credit-lines-panel">
      <h3 style={h3}>Approved credit lines</h3>
      <p style={muted}>Lines a lender has approved for this client. Draws reduce what is available; a reminder task goes out before a line expires.</p>
      <ErrorLine text={err} />
      {msg && <p role="status" style={{ ...muted, color: "var(--ui-text)" }}>{msg}</p>}
      {lines === null ? <p style={muted}>Loading...</p> : lines.length === 0 ? <p style={muted}>No credit lines recorded for this client.</p> : lines.map((l) => (
        <div key={l.id} data-testid={`credit-line-${l.id}`} style={{ borderTop: "1px solid var(--ui-border)", paddingTop: 12, marginTop: 12 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <strong style={{ fontSize: 14 }}>{l.lender_name ?? "Lender"}{l.product_name ? ` - ${l.product_name}` : ""}</strong>
            <LineChip l={l} />
            {linked === l.id && <Chip tone="blue">This deal draws on it</Chip>}
            <span style={{ fontSize: 13, color: "var(--ui-text-muted)" }}>{expiryText(l)}</span>
          </div>
          <p style={{ ...muted, color: "var(--ui-text)" }} data-testid="credit-line-amounts">Limit {money(l.limit_amount)} - used {money(l.used)} - available {money(l.available)}</p>
          {l.conditions && <p style={muted}>Conditions: {l.conditions}</p>}
          {l.draws.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table style={table}>
                <thead><tr>{["Date", "Type", "Amount", "Note", ""].map((x) => <th key={x} style={th}>{x}</th>)}</tr></thead>
                <tbody>{l.draws.map((d) => (
                  <tr key={d.id} style={d.reversed ? { opacity: 0.6, textDecoration: "line-through" } : undefined}>
                    <td style={td}>{d.drawn_on}</td><td style={td}>{d.kind === "draw" ? (d.source === "funded" ? "Draw (funded)" : "Draw") : "Repayment"}</td>
                    <td style={td}>{money(d.amount)}</td><td style={td}>{d.note ?? ""}</td>
                    <td style={td}>{!d.reversed && <button type="button" style={secondaryButton} disabled={busy} onClick={() => { if (window.confirm("Reverse this entry?")) void run(() => api.delete(`/api/deal-desk/credit-lines/${l.id}/draws/${d.id}`)); }}>Reverse</button>}</td>
                  </tr>))}
                </tbody>
              </table>
            </div>
          )}
          {l.status === "active" && (
            <div style={{ ...row, marginTop: 8 }}>
              <label style={label}>Type
                <select style={input} value={draw[l.id]?.kind ?? "draw"} onChange={(e) => setDraw((x) => ({ ...x, [l.id]: { amount: x[l.id]?.amount ?? "", note: x[l.id]?.note ?? "", kind: e.target.value } }))}>
                  <option value="draw">Draw</option><option value="repayment">Repayment</option>
                </select>
              </label>
              <label style={label}>Amount<input aria-label={`Amount for ${l.lender_name ?? "line"}`} inputMode="decimal" style={{ ...input, width: 130 }} value={draw[l.id]?.amount ?? ""} onChange={(e) => setDraw((x) => ({ ...x, [l.id]: { kind: x[l.id]?.kind ?? "draw", note: x[l.id]?.note ?? "", amount: e.target.value } }))} /></label>
              <label style={label}>Note<input style={input} value={draw[l.id]?.note ?? ""} onChange={(e) => setDraw((x) => ({ ...x, [l.id]: { kind: x[l.id]?.kind ?? "draw", amount: x[l.id]?.amount ?? "", note: e.target.value } }))} /></label>
              <button type="button" style={primaryButton} disabled={busy} onClick={() => void record(l)}>Record</button>
              {linked === l.id
                ? <button type="button" style={secondaryButton} disabled={busy} onClick={() => void run(() => api.put(`${base}/credit-line`, { credit_line_id: null }))}>Stop drawing for this deal</button>
                : <button type="button" style={secondaryButton} disabled={busy} onClick={() => void run(() => api.put(`${base}/credit-line`, { credit_line_id: l.id }), "This deal will draw on the line when it funds.")}>Draw on this line when this deal funds</button>}
              <button type="button" style={secondaryButton} disabled={busy} onClick={() => { if (window.confirm("Close this line?")) void run(() => api.patch(`/api/deal-desk/credit-lines/${l.id}`, { status: "closed" })); }}>Close line</button>
            </div>
          )}
        </div>
      ))}
      <h3 style={{ ...h3, marginTop: 16 }}>Record an approved line</h3>
      <div style={row}>
        <label style={label}>Lender<input style={input} value={form.lender_name} onChange={(e) => setForm({ ...form, lender_name: e.target.value })} /></label>
        <label style={label}>Product<input style={input} value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} /></label>
        <label style={label}>Limit<input inputMode="decimal" style={{ ...input, width: 130 }} value={form.limit_amount} onChange={(e) => setForm({ ...form, limit_amount: e.target.value })} /></label>
        <label style={label}>Approved<input type="date" style={input} value={form.approved_on} onChange={(e) => setForm({ ...form, approved_on: e.target.value })} /></label>
        <label style={label}>Expires<input type="date" style={input} value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} /></label>
        <label style={label}>Remind days before<input inputMode="numeric" style={{ ...input, width: 80 }} value={form.reminder_days} onChange={(e) => setForm({ ...form, reminder_days: e.target.value })} /></label>
      </div>
      <label style={{ ...label, marginTop: 8 }}>Conditions<textarea style={{ ...input, minHeight: 50 }} value={form.conditions} onChange={(e) => setForm({ ...form, conditions: e.target.value })} /></label>
      <div style={{ ...row, marginTop: 8 }}><button type="button" style={primaryButton} disabled={busy} onClick={() => void add()}>Save line</button></div>
    </section>
  );
}

/** Settings > Deal tools > Credit lines: every client's lines, soonest expiry first. */
export function CreditLinesReport() {
  const [lines, setLines] = useState<CreditLine[] | null>(null);
  const [within, setWithin] = useState("60");
  useEffect(() => {
    void api.get<{ lines: CreditLine[] }>(`/api/deal-desk/credit-lines?status=active${within ? `&expiring_within=${within}` : ""}`)
      .then((r) => setLines(Array.isArray(r?.lines) ? r.lines : [])).catch(() => setLines([]));
  }, [within]);
  return (
    <section style={card} data-testid="credit-lines-report">
      <h3 style={h3}>Approved credit lines</h3>
      <div style={row}>
        <label style={label}>Show
          <select style={input} value={within} onChange={(e) => setWithin(e.target.value)}>
            <option value="30">Expiring in 30 days</option><option value="60">Expiring in 60 days</option><option value="">All active lines</option>
          </select>
        </label>
      </div>
      {lines === null ? <p style={muted}>Loading...</p> : lines.length === 0 ? <p style={muted}>No lines to show.</p> : (
        <div style={{ overflowX: "auto", marginTop: 8 }}>
          <table style={table}>
            <thead><tr>{["Client", "Lender", "Limit", "Available", "Expiry", ""].map((x) => <th key={x} style={th}>{x}</th>)}</tr></thead>
            <tbody>{lines.map((l) => (
              <tr key={l.id}><td style={td}>{l.company_name ?? "-"}</td><td style={td}>{l.lender_name ?? "-"}</td><td style={td}>{money(l.limit_amount)}</td>
                <td style={td}>{money(l.available)}</td><td style={td}>{expiryText(l)}</td><td style={td}><LineChip l={l} /></td></tr>))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
