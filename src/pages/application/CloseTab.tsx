// BF_PORTAL_v942_CLOSE_TAB - the Close tab (Todd and Andrew, Nov 11 2026), shown once the client signs a term sheet:
// what closed (date, currency, amount, rate, term, lender, broker, who found the deal) and every way the brokerage is
// paid on it - lender commission (set amount or % of funded), monthly profit share (entered from the lender's statement
// each month), client / set-up / proceeds fees, the rate difference, and the referral fee owed. Each line is marked
// received when the money arrives (brokers are paid on received money) or clawed back if the lender takes it back.
// "Mark as funded" moves the file to Funded (open funding conditions block it). The fee payment links live here too.
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { api } from "@/api";
import { getErrorMessage } from "@/utils/errors";
import PaymentLinksPanel from "@/payments/PaymentLinksPanel";

type Line = {
  id?: string; kind: string; description: string | null; basis: "flat" | "percent"; percent: number | null; expected_amount: number | null;
  month?: string | null; received_amount?: number | null; received_on?: string | null; status?: string;
};
type Close = {
  id?: string; offer_id?: string | null; closed_on: string; currency: "CAD" | "USD"; funded_amount: number; rate: string | null; term_months: number | null;
  payment_frequency: string | null; lender_name: string | null; broker_user_id: string | null; lead_source: "self" | "company"; clawback_days: number | null;
  residual_percent: number | null; residual_months: number | null; notes: string | null; lines?: Line[];
};

export const KIND_LABEL: Record<string, string> = {
  lender_commission: "Lender commission", residual: "Profit share (monthly)", client_fee: "Broker fee (client)", setup_fee: "Set-up fee",
  proceeds_fee: "Fee from proceeds", spread: "Rate difference", referral_fee: "Referral fee owed (money out)", other: "Other revenue",
};
const STATUS: Record<string, { t: string; bg: string; fg: string }> = {
  expected: { t: "Expected", bg: "#f1f5f9", fg: "#334155" }, received: { t: "Received", bg: "#dcfce7", fg: "#166534" },
  clawed_back: { t: "Clawed back", bg: "#fee2e2", fg: "#991b1b" }, written_off: { t: "Written off", bg: "#f1f5f9", fg: "#64748b" },
};

const card: CSSProperties = { padding: 16, border: "1px solid var(--ui-border)", borderRadius: 12, background: "var(--ui-surface-strong)", color: "var(--ui-text)", marginBottom: 16 };
const grid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10, marginTop: 10 };
const lab: CSSProperties = { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--ui-text-muted)" };
const inp: CSSProperties = { padding: "7px 9px", borderRadius: 8, border: "1px solid var(--ui-border)", background: "var(--ui-surface)", color: "var(--ui-text)", fontSize: 13 };
const btn: CSSProperties = { padding: "8px 14px", borderRadius: 8, border: "1px solid #1e3a8a", background: "#1e3a8a", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" };
const plain: CSSProperties = { ...btn, background: "var(--ui-surface)", color: "var(--ui-text)", borderColor: "var(--ui-border)" };
const money = (n: number | null | undefined, cur = "CAD") => (n === null || n === undefined || !Number.isFinite(n) ? "—" : n.toLocaleString("en-CA", { style: "currency", currency: cur, maximumFractionDigits: 0 }));
const today = () => new Date().toISOString().slice(0, 10);

export default function CloseTab({ applicationId }: { applicationId: string }) {
  const [close, setClose] = useState<Close | null>(null);
  const [saved, setSaved] = useState(false);
  const [referralPartner, setReferralPartner] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [receive, setReceive] = useState<Record<string, { amount: string; on: string }>>({});
  const [residual, setResidual] = useState({ month: today().slice(0, 7), amount: "", received: true });

  const load = useCallback(async () => {
    try {
      const r = await api.get<any>(`/api/deals/applications/${encodeURIComponent(applicationId)}/close`);
      if (r?.saved) { setClose({ ...r.close, lines: r.lines }); setSaved(true); }
      else { setClose(r?.suggested ?? null); setReferralPartner(r?.suggested?.referral_partner ?? null); setSaved(false); }
    } catch (e) { setMsg({ ok: false, text: getErrorMessage(e, "The close could not be loaded.") }); }
  }, [applicationId]);
  useEffect(() => { if (applicationId) void load(); }, [applicationId, load]);

  if (!close) return <div data-testid="close-tab" style={{ maxWidth: 1100 }}>{msg ? <p role="alert">{msg.text}</p> : <p>Loading…</p>}</div>;
  const set = <K extends keyof Close>(k: K, v: Close[K]) => setClose((c) => (c ? { ...c, [k]: v } : c));
  const lines = close.lines ?? [];
  const setLine = (i: number, patch: Partial<Line>) => set("lines", lines.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const funded = Number(close.funded_amount) || 0;
  const lineAmount = (l: Line) => (l.basis === "percent" && l.percent !== null ? Math.round(funded * l.percent) / 100 : l.expected_amount ?? 0);
  const inbound = lines.filter((l) => l.kind !== "referral_fee" && l.status !== "written_off").reduce((a, l) => a + lineAmount(l), 0);
  const owed = lines.filter((l) => l.kind === "referral_fee").reduce((a, l) => a + lineAmount(l), 0);

  async function save() {
    setBusy("save"); setMsg(null);
    try {
      const r = await api.put<any>(`/api/deals/applications/${encodeURIComponent(applicationId)}/close`, { ...close, lines: lines.map((l) => ({ ...l, expected_amount: lineAmount(l) })) });
      setClose({ ...r.close, lines: r.lines }); setSaved(true);
      setMsg({ ok: true, text: "Close saved." });
    } catch (e) { setMsg({ ok: false, text: getErrorMessage(e, "The close could not be saved.") }); }
    finally { setBusy(null); }
  }

  async function markFunded() {
    setBusy("funded"); setMsg(null);
    try {
      await api.patch(`/api/portal/applications/${encodeURIComponent(applicationId)}/status`, { status: "Funded", reason: "Closed" });
      setMsg({ ok: true, text: "The file is now Funded." });
    } catch (e) { setMsg({ ok: false, text: getErrorMessage(e, "The file could not move to Funded. Clear or waive the open funding conditions on the Offer tab first.") }); }
    finally { setBusy(null); }
  }

  async function received(l: Line) {
    if (!l.id) return;
    const r = receive[l.id] ?? { amount: String(lineAmount(l) || ""), on: today() };
    setBusy(`r-${l.id}`); setMsg(null);
    try { await api.post(`/api/deals/lines/${encodeURIComponent(l.id)}/received`, r); await load(); }
    catch (e) { setMsg({ ok: false, text: getErrorMessage(e, "That could not be marked received.") }); }
    finally { setBusy(null); }
  }

  async function clawback(l: Line) {
    if (!l.id || !window.confirm("Record that the lender took this money back? The broker's share comes off their next pay statement.")) return;
    setBusy(`c-${l.id}`);
    try { await api.post(`/api/deals/lines/${encodeURIComponent(l.id)}/clawback`, { on: today() }); await load(); }
    catch (e) { setMsg({ ok: false, text: getErrorMessage(e, "The clawback could not be recorded.") }); }
    finally { setBusy(null); }
  }

  async function addResidual() {
    if (!close?.id) return;
    setBusy("residual"); setMsg(null);
    try {
      await api.post(`/api/deals/closes/${encodeURIComponent(close.id)}/residual`, { month: residual.month, amount: residual.amount, received_on: residual.received ? today() : null });
      setResidual((x) => ({ ...x, amount: "" })); await load();
    } catch (e) { setMsg({ ok: false, text: getErrorMessage(e, "The month could not be added.") }); }
    finally { setBusy(null); }
  }

  return (
    <div data-testid="close-tab" style={{ maxWidth: 1100 }}>
      <section style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>What closed</h3>
          {!saved ? <span style={{ fontSize: 12, color: "#92400e", background: "#fef3c7", padding: "2px 8px", borderRadius: 999 }}>Filled in from the signed offer - check and save</span> : null}
        </div>
        <div style={grid}>
          <label style={lab}>Close date<input aria-label="Close date" type="date" style={inp} value={close.closed_on} onChange={(e) => set("closed_on", e.target.value)} /></label>
          <label style={lab}>Currency
            <select aria-label="Currency" style={inp} value={close.currency} onChange={(e) => set("currency", e.target.value as "CAD" | "USD")}><option>CAD</option><option>USD</option></select>
          </label>
          <label style={lab}>Amount funded<input aria-label="Amount funded" style={inp} value={String(close.funded_amount ?? "")} onChange={(e) => set("funded_amount", Number(e.target.value.replace(/[$,\s]/g, "")) || 0)} /></label>
          <label style={lab}>Rate / factor<input aria-label="Rate" style={inp} value={close.rate ?? ""} onChange={(e) => set("rate", e.target.value)} /></label>
          <label style={lab}>Term (months)<input aria-label="Term in months" style={inp} value={close.term_months ?? ""} onChange={(e) => set("term_months", Number(e.target.value) || null)} /></label>
          <label style={lab}>Payments<input aria-label="Payments" style={inp} value={close.payment_frequency ?? ""} onChange={(e) => set("payment_frequency", e.target.value)} /></label>
          <label style={lab}>Lender<input aria-label="Lender" style={inp} value={close.lender_name ?? ""} onChange={(e) => set("lender_name", e.target.value)} /></label>
          <label style={lab}>Who found the deal
            <select aria-label="Who found the deal" style={inp} value={close.lead_source} onChange={(e) => set("lead_source", e.target.value as "self" | "company")}>
              <option value="company">Company lead</option><option value="self">The broker (self-sourced)</option>
            </select>
          </label>
          <label style={lab}>Clawback window (days)<input aria-label="Clawback window" style={inp} value={close.clawback_days ?? ""} onChange={(e) => set("clawback_days", Number(e.target.value) || null)} /></label>
          <label style={lab}>Profit share (% of lender's profit)<input aria-label="Profit share percent" style={inp} value={close.residual_percent ?? ""} onChange={(e) => set("residual_percent", Number(e.target.value) || null)} /></label>
          <label style={lab}>Profit share months (blank = life of deal)<input aria-label="Profit share months" style={inp} value={close.residual_months ?? ""} onChange={(e) => set("residual_months", Number(e.target.value) || null)} /></label>
        </div>
      </section>

      <section style={card}>
        <h3 style={{ margin: 0, fontSize: 16 }}>How we are paid on this deal</h3>
        <p style={{ fontSize: 12, color: "var(--ui-text-muted)", margin: "4px 0 0" }}>Any mix. Brokers are paid on money received{referralPartner ? `; the referral fee to ${referralPartner} comes off before the broker's split` : ""}.</p>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginTop: 10 }}>
          <thead><tr>{["Type", "Description", "Set amount or %", "Expected", "Status", ""].map((h) => <th key={h} style={{ textAlign: "left", padding: "6px", fontSize: 11, color: "var(--ui-text-muted)", borderBottom: "1px solid var(--ui-border)" }}>{h}</th>)}</tr></thead>
          <tbody>
            {lines.map((l, i) => {
              const locked = l.status === "received" || l.status === "clawed_back";
              const st = STATUS[l.status ?? "expected"] ?? STATUS.expected!;
              const r = l.id ? receive[l.id] ?? { amount: String(lineAmount(l) || ""), on: today() } : null;
              return (
                <tr key={l.id ?? `new-${i}`} data-testid={`close-line-${i}`} style={{ borderBottom: "1px solid var(--ui-border)" }}>
                  <td style={{ padding: 6 }}>
                    <select aria-label="Revenue type" disabled={locked} style={inp} value={l.kind} onChange={(e) => setLine(i, { kind: e.target.value })}>
                      {Object.entries(KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: 6 }}><input aria-label="Description" disabled={locked} style={inp} value={l.description ?? ""} onChange={(e) => setLine(i, { description: e.target.value })} />{l.month ? <div style={{ fontSize: 11, color: "var(--ui-text-muted)" }}>{l.month.slice(0, 7)}</div> : null}</td>
                  <td style={{ padding: 6, whiteSpace: "nowrap" }}>
                    <select aria-label="Set amount or percent" disabled={locked} style={{ ...inp, width: 70 }} value={l.basis} onChange={(e) => setLine(i, { basis: e.target.value as Line["basis"] })}><option value="flat">$</option><option value="percent">%</option></select>{" "}
                    <input aria-label="Amount or percent" disabled={locked} style={{ ...inp, width: 100 }} value={l.basis === "percent" ? l.percent ?? "" : l.expected_amount ?? ""} onChange={(e) => { const n = Number(e.target.value.replace(/[$,%\s]/g, "")); setLine(i, l.basis === "percent" ? { percent: Number.isFinite(n) ? n : null } : { expected_amount: Number.isFinite(n) ? n : null }); }} />
                  </td>
                  <td style={{ padding: 6, fontWeight: 600, color: l.kind === "referral_fee" ? "#b91c1c" : undefined }}>{l.kind === "referral_fee" ? "−" : ""}{money(lineAmount(l), close.currency)}</td>
                  <td style={{ padding: 6 }}><span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: st.bg, color: st.fg }}>{st.t}</span>{l.received_on ? <div style={{ fontSize: 11 }}>{money(l.received_amount ?? null, close.currency)} on {l.received_on}</div> : null}</td>
                  <td style={{ padding: 6, whiteSpace: "nowrap" }}>
                    {l.id && l.kind !== "referral_fee" && l.status === "expected" && r ? <>
                      <input aria-label="Amount received" style={{ ...inp, width: 90 }} value={r.amount} onChange={(e) => setReceive((x) => ({ ...x, [l.id!]: { ...r, amount: e.target.value } }))} />{" "}
                      <input aria-label="Date received" type="date" style={{ ...inp, width: 140 }} value={r.on} onChange={(e) => setReceive((x) => ({ ...x, [l.id!]: { ...r, on: e.target.value } }))} />{" "}
                      <button type="button" style={plain} disabled={busy !== null} onClick={() => void received(l)} data-testid={`close-received-${i}`}>Received</button>
                    </> : null}
                    {l.id && l.status === "received" ? <button type="button" style={{ ...plain, color: "#b91c1c" }} disabled={busy !== null} onClick={() => void clawback(l)}>Clawed back</button> : null}
                    {!locked ? <button type="button" aria-label="Remove line" style={{ ...plain, marginLeft: 4 }} onClick={() => set("lines", lines.filter((_, j) => j !== i))}>✕</button> : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" style={plain} onClick={() => set("lines", [...lines, { kind: "lender_commission", description: null, basis: "flat", percent: null, expected_amount: null, status: "expected" }])} data-testid="close-add-line">Add revenue</button>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 13 }}>Expected revenue <strong data-testid="close-expected">{money(inbound, close.currency)}</strong>{owed ? <> · referral fee owed <strong>{money(owed, close.currency)}</strong> · ours after referral <strong>{money(inbound - owed, close.currency)}</strong></> : null}</span>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <button type="button" style={btn} disabled={busy !== null} onClick={() => void save()} data-testid="close-save">{busy === "save" ? "Saving…" : "Save the close"}</button>
          {saved ? <button type="button" style={plain} disabled={busy !== null} onClick={() => void markFunded()} data-testid="close-funded">{busy === "funded" ? "Moving…" : "Mark as funded"}</button> : null}
        </div>
        {msg ? <p role={msg.ok ? "status" : "alert"} style={{ fontSize: 13, color: msg.ok ? "#166534" : "#b91c1c" }}>{msg.text}</p> : null}
      </section>

      {saved && close.id ? (
        <section style={card} data-testid="close-residual">
          <h3 style={{ margin: 0, fontSize: 16 }}>Add a month of profit share</h3>
          <p style={{ fontSize: 12, color: "var(--ui-text-muted)", margin: "4px 0 0" }}>From the lender's monthly statement. It changes every month, so it is entered as it arrives.</p>
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input aria-label="Month" type="month" style={inp} value={residual.month} onChange={(e) => setResidual((x) => ({ ...x, month: e.target.value }))} />
            <input aria-label="Profit share amount" style={inp} placeholder="Amount" value={residual.amount} onChange={(e) => setResidual((x) => ({ ...x, amount: e.target.value }))} />
            <label style={{ fontSize: 13 }}><input type="checkbox" checked={residual.received} onChange={(e) => setResidual((x) => ({ ...x, received: e.target.checked }))} /> Received today</label>
            <button type="button" style={plain} disabled={busy !== null || !residual.amount} onClick={() => void addResidual()}>Add month</button>
          </div>
        </section>
      ) : null}

      <PaymentLinksPanel applicationId={applicationId} />
    </div>
  );
}
