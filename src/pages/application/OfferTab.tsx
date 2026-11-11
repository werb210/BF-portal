// BF_PORTAL_v938_CARD_REDESIGN - Lenders > Offer. Every term sheet on the file (uploaded beside the lender on the Lenders
// sub-tab, or received by API), each with its terms, the term sheet PDF and "Send to client for signature". Below them the
// funding conditions: read from the lender's term sheet, approved by the broker (only approved conditions reach the
// client portal), tracked until cleared or waived; the file cannot move to Funded while any is open.
// The client portal shows two or more offers side by side (BF_CLIENT_OFFERS_IN_THREAD_v3).
// OFFER_PRICING_v1 - each offer's Pricing: whose term sheet the client signs (the lender's, or ours when we buy the deal -
// then no lender name reaches the client), our rate to the client, broker fee, set-up fee, fee from proceeds and the
// lender's commission, in any mix, with what the offer earns us.
import { Fragment, useCallback, useEffect, useState, type CSSProperties } from "react";
import { api } from "@/api";
import { getErrorMessage } from "@/utils/errors";
import FundingConditionsPanel from "@/brokerTools/FundingConditionsPanel";
import Gate from "@/brokerTools/gate";

export type FileOffer = {
  id: string; lender_name: string; amount: string | number | null; rate_factor: string | null; term: string | null;
  payment_frequency: string | null; expiry_date: string | null; document_url: string | null; status: string; created_at?: string;
  term_sheet_mode?: "lender" | "ours" | null; client_rate?: string | null; term_months?: number | null; broker_fee?: string | null;
  setup_fee?: string | null; proceeds_fee?: string | null; lender_commission?: string | null; has_lender_term_sheet?: boolean;
  revenue?: Revenue | null;
};
export type Revenue = {
  spread: number | null; broker_fee: number; setup_fee: number; proceeds_fee: number; lender_commission: number; total: number;
  funds_to_client: number | null; client_payment: number | null; client_total_repaid: number | null; term_months: number | null; note: string | null;
};

const cents = (n: number | null | undefined): string =>
  n === null || n === undefined || !Number.isFinite(n) ? "—" : n.toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });
const field: CSSProperties = { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--ui-text-muted)", minWidth: 130 };
const inp: CSSProperties = { padding: "6px 8px", borderRadius: 8, border: "1px solid var(--ui-border)", background: "var(--ui-surface)", color: "var(--ui-text)", fontSize: 13, width: 130 };

const PRICE_KEYS = ["client_rate", "term_months", "broker_fee", "setup_fee", "proceeds_fee", "lender_commission"] as const;
type PriceKey = (typeof PRICE_KEYS)[number];

export function PricingPanel({ offer, onSaved }: { offer: FileOffer; onSaved: () => void }) {
  const [mode, setMode] = useState<"lender" | "ours">(offer.term_sheet_mode === "ours" ? "ours" : "lender");
  const [vals, setVals] = useState<Record<PriceKey, string>>(() => Object.fromEntries(PRICE_KEYS.map((k) => [k, offer[k] === null || offer[k] === undefined ? "" : String(offer[k])])) as Record<PriceKey, string>);
  const [rev, setRev] = useState<Revenue | null>(offer.revenue ?? null);
  const [busy, setBusy] = useState<"save" | "make" | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const set = (k: PriceKey) => (e: React.ChangeEvent<HTMLInputElement>) => setVals((v) => ({ ...v, [k]: e.target.value }));

  async function save() {
    setBusy("save"); setMsg(null);
    try {
      const body: Record<string, unknown> = { term_sheet_mode: mode };
      for (const k of PRICE_KEYS) body[k] = vals[k].trim() === "" ? null : vals[k].trim();
      if (mode === "lender") body.client_rate = null;
      const r = await api.patch<{ offer?: { revenue?: Revenue } }>(`/api/offers/${encodeURIComponent(offer.id)}/pricing`, body);
      setRev(r?.offer?.revenue ?? null);
      setMsg({ ok: true, text: "Pricing saved." });
      onSaved();
    } catch (e) { setMsg({ ok: false, text: getErrorMessage(e, "The pricing could not be saved.") }); }
    finally { setBusy(null); }
  }

  async function makeOurs() {
    setBusy("make"); setMsg(null);
    try {
      const r = await api.post<{ message?: string }>(`/api/licensee-documents/offers/${encodeURIComponent(offer.id)}/term-sheet`, {});
      setMsg({ ok: true, text: r?.message ?? "Our term sheet is now this offer's term sheet." });
      onSaved();
    } catch (e) { setMsg({ ok: false, text: getErrorMessage(e, "Our term sheet could not be made. Upload it in Settings > Our term sheet first.") }); }
    finally { setBusy(null); }
  }

  const lines: Array<[string, number | null]> = rev ? [
    ["Rate difference", rev.spread], ["Broker fee", rev.broker_fee], ["Set-up fee", rev.setup_fee],
    ["Fee from proceeds", rev.proceeds_fee], ["Lender commission", rev.lender_commission],
  ] : [];
  return (
    <div data-testid={`pricing-${offer.id}`} style={{ padding: 12, background: "var(--ui-surface)", borderRadius: 10, border: "1px solid var(--ui-border)" }}>
      <div role="radiogroup" aria-label="Whose term sheet the client signs" style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13 }}>
        <label><input type="radio" name={`mode-${offer.id}`} checked={mode === "lender"} onChange={() => setMode("lender")} /> The lender&apos;s term sheet (the client sees {offer.lender_name || "the lender"})</label>
        <label><input type="radio" name={`mode-${offer.id}`} data-testid={`mode-ours-${offer.id}`} checked={mode === "ours"} onChange={() => setMode("ours")} /> Our term sheet (we buy the deal; no lender name)</label>
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 10 }}>
        {mode === "ours" ? (
          <label style={field}>Our rate to the client
            <input style={inp} value={vals.client_rate} onChange={set("client_rate")} placeholder={offer.rate_factor ? `lender: ${offer.rate_factor}` : "e.g. 7"} aria-label="Our rate to the client" />
          </label>
        ) : null}
        <label style={field}>Term (months)
          <input style={inp} value={vals.term_months} onChange={set("term_months")} placeholder={offer.term || "e.g. 36"} aria-label="Term in months" />
        </label>
        <label style={field}>Broker fee ($)<input style={inp} value={vals.broker_fee} onChange={set("broker_fee")} aria-label="Broker fee" /></label>
        <label style={field}>Set-up fee ($)<input style={inp} value={vals.setup_fee} onChange={set("setup_fee")} aria-label="Set-up fee" /></label>
        <label style={field}>Fee from proceeds ($)<input style={inp} value={vals.proceeds_fee} onChange={set("proceeds_fee")} aria-label="Fee from proceeds" /></label>
        <label style={field}>Lender commission ($)<input style={inp} value={vals.lender_commission} onChange={set("lender_commission")} aria-label="Lender commission" /></label>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <button type="button" style={primary} disabled={busy !== null} onClick={() => void save()} data-testid={`pricing-save-${offer.id}`}>{busy === "save" ? "Saving…" : "Save pricing"}</button>
        {mode === "ours" ? (
          <button type="button" style={btn} disabled={busy !== null} onClick={() => void makeOurs()} data-testid={`make-ours-${offer.id}`}>{busy === "make" ? "Making…" : "Make our term sheet"}</button>
        ) : null}
      </div>
      {msg ? <div role={msg.ok ? "status" : "alert"} style={{ fontSize: 12, marginTop: 6, color: msg.ok ? "#166534" : "#b91c1c" }}>{msg.text}</div> : null}
      {rev ? (
        <div data-testid={`revenue-${offer.id}`} style={{ marginTop: 12, display: "flex", gap: 20, flexWrap: "wrap", fontSize: 13 }}>
          {lines.filter(([, v]) => v !== 0).map(([l, v]) => <div key={l}><div style={{ fontSize: 11, color: "var(--ui-text-muted)" }}>{l}</div><div>{cents(v)}</div></div>)}
          <div><div style={{ fontSize: 11, color: "var(--ui-text-muted)" }}>Our revenue</div><div style={{ fontWeight: 700 }}>{cents(rev.total)}</div></div>
          {rev.proceeds_fee ? <div><div style={{ fontSize: 11, color: "var(--ui-text-muted)" }}>Client receives</div><div>{cents(rev.funds_to_client)}</div></div> : null}
          {rev.client_payment ? <div><div style={{ fontSize: 11, color: "var(--ui-text-muted)" }}>Client payment / month</div><div>{cents(rev.client_payment)}</div></div> : null}
          {rev.note ? <div style={{ flexBasis: "100%", color: "#92400e" }}>{rev.note}</div> : null}
        </div>
      ) : null}
    </div>
  );
}

const card: CSSProperties = { padding: 16, border: "1px solid var(--ui-border)", borderRadius: 12, background: "var(--ui-surface-strong)", color: "var(--ui-text)", marginBottom: 16 };
const muted: CSSProperties = { fontSize: 13, color: "var(--ui-text-muted)", margin: "4px 0 0" };
const btn: CSSProperties = { padding: "6px 12px", borderRadius: 8, border: "1px solid var(--ui-border)", background: "var(--ui-surface)", color: "var(--ui-text)", fontWeight: 600, fontSize: 13, cursor: "pointer" };
const primary: CSSProperties = { ...btn, background: "#1e3a8a", borderColor: "#1e3a8a", color: "#fff" };

const STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  pending: { label: "Not sent yet", bg: "#f1f5f9", fg: "#334155" },
  pending_acceptance: { label: "Waiting for the client's signature", bg: "#fef3c7", fg: "#92400e" },
  accepted: { label: "Signed by the client", bg: "#dcfce7", fg: "#166534" },
  rejected: { label: "Declined", bg: "#fee2e2", fg: "#991b1b" },
  changes_requested: { label: "Client asked for changes", bg: "#dbeafe", fg: "#1e40af" },
};

export function money(v: unknown): string {
  const n = Number(String(v ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n.toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }) : "—";
}

export default function OfferTab({ applicationId, onOpenLenders }: { applicationId: string; onOpenLenders?: () => void }) {
  const [offers, setOffers] = useState<FileOffer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Record<string, { ok: boolean; text: string }>>({});
  const [pricingOpen, setPricingOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ items?: FileOffer[] }>(`/api/offers?applicationId=${encodeURIComponent(applicationId)}`);
      setOffers(Array.isArray(res?.items) ? res.items : []);
      setError(null);
    } catch (e) { setError(getErrorMessage(e, "Could not load the offers on this file.")); setOffers([]); }
  }, [applicationId]);
  useEffect(() => { if (applicationId) void load(); }, [applicationId, load]);

  async function send(o: FileOffer) {
    if (busy) return;
    setBusy(o.id); setMsgs((m) => { const n = { ...m }; delete n[o.id]; return n; });
    try {
      await api.post(`/api/offers/${encodeURIComponent(o.id)}/send-for-signature`, {});
      setMsgs((m) => ({ ...m, [o.id]: { ok: true, text: "Sent. The client has a text and can review and sign it in their app." } }));
      void load();
    } catch (e) {
      setMsgs((m) => ({ ...m, [o.id]: { ok: false, text: getErrorMessage(e, "The term sheet could not be sent for signature. Try again.") } }));
    } finally { setBusy(null); }
  }

  return (
    <div data-testid="offer-tab" style={{ maxWidth: 1200 }}>
      <section style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Term sheets on this file</h3>
          <span style={{ flex: 1 }} />
          {onOpenLenders ? <button type="button" style={btn} onClick={onOpenLenders}>Upload a lender's term sheet</button> : null}
        </div>
        <p style={muted}>Upload each lender's term sheet beside the lender on the Lenders tab. Two or more offers show side by side in the client portal.</p>
        {error ? <p role="alert" style={{ ...muted, color: "#b91c1c" }}>{error}</p> : null}
        {offers === null ? <p style={muted}>Loading…</p> : offers.length === 0 ? (
          <p data-testid="offer-none" style={{ ...muted, marginTop: 12 }}>No term sheet yet.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginTop: 12 }}>
            <thead><tr>{["Lender", "Amount", "Rate / factor", "Term", "Payments", "Expires", "Our revenue", "Status", ""].map((h) => (
              <th key={h} style={{ textAlign: "left", padding: "6px 6px", fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--ui-text-muted)", borderBottom: "1px solid var(--ui-border)" }}>{h}</th>
            ))}</tr></thead>
            <tbody>
              {offers.map((o) => {
                const st = STATUS[o.status] ?? { label: o.status, bg: "#f1f5f9", fg: "#334155" };
                const m = msgs[o.id];
                const sent = o.status === "pending_acceptance" || o.status === "accepted";
                return (
                  <Fragment key={o.id}>
                  <tr data-testid={`offer-row-${o.id}`} style={{ borderBottom: "1px solid var(--ui-border)" }}>
                    <td style={{ padding: "8px 6px", fontWeight: 700 }}>
                      {o.lender_name}
                      {o.term_sheet_mode === "ours" ? <div style={{ fontSize: 11, fontWeight: 600, color: "#1e40af" }}>Our term sheet · client doesn&apos;t see the lender</div> : null}
                    </td>
                    <td style={{ padding: "8px 6px" }}>{money(o.amount)}</td>
                    <td style={{ padding: "8px 6px" }}>{o.rate_factor || "—"}</td>
                    <td style={{ padding: "8px 6px" }}>{o.term || "—"}</td>
                    <td style={{ padding: "8px 6px" }}>{o.payment_frequency || "—"}</td>
                    <td style={{ padding: "8px 6px" }}>{o.expiry_date ? String(o.expiry_date).slice(0, 10) : "—"}</td>
                    <td style={{ padding: "8px 6px", fontWeight: 600 }} data-testid={`offer-revenue-${o.id}`}>{o.revenue && o.revenue.total > 0 ? cents(o.revenue.total) : "—"}</td>
                    <td style={{ padding: "8px 6px" }}><span style={{ padding: "2px 9px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: st.bg, color: st.fg }}>{st.label}</span></td>
                    <td style={{ padding: "8px 6px", whiteSpace: "nowrap" }}>
                      <button type="button" style={{ ...btn, marginRight: 6 }} aria-expanded={pricingOpen === o.id} data-testid={`offer-pricing-${o.id}`} onClick={() => setPricingOpen(pricingOpen === o.id ? null : o.id)}>Pricing</button>
                      {o.document_url ? <a href={o.document_url} target="_blank" rel="noreferrer" style={{ ...btn, textDecoration: "none", display: "inline-block", marginRight: 6 }}>Term sheet</a> : null}
                      <button type="button" data-testid={`offer-send-${o.id}`} style={sent ? btn : primary} disabled={busy === o.id || o.status === "accepted"} aria-busy={busy === o.id} onClick={() => void send(o)}>
                        {busy === o.id ? "Sending…" : o.status === "accepted" ? "Signed" : sent ? "Send again" : "Send to client for signature"}
                      </button>
                      {m ? <div role={m.ok ? "status" : "alert"} style={{ fontSize: 12, marginTop: 4, color: m.ok ? "#166534" : "#b91c1c", whiteSpace: "normal" }}>{m.text}</div> : null}
                    </td>
                  </tr>
                  {pricingOpen === o.id ? (
                    <tr><td colSpan={9} style={{ padding: "4px 6px 12px" }}><PricingPanel offer={o} onSaved={() => void load()} /></td></tr>
                  ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
      <Gate feature="funding_conditions"><FundingConditionsPanel applicationId={applicationId} /></Gate>
    </div>
  );
}
