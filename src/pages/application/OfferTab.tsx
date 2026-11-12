// BF_PORTAL_v946_OFFER_STEPS - the Offer tab as three numbered steps (Todd, Nov 12 2026: "this makes no sense to me... I
// would never hand this to a broker and expect them to know how to use it").
//   1. Term sheet           - pick the lender, then the lender's term sheet or our template; check the figures; save.
//                             Once saved it is one summary line with View and Change.
//   2. Send to the client   - one button, then the state: not sent / waiting for the signature / signed.
//   3. Conditions           - a checklist, one line each, grouped by who has to act.
// There is one place to upload the lender's term sheet (step 1); the separate "read the lender's offer document" box and
// the Pricing panel are gone (rate and fees are part of step 1 and of Change).
import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { api } from "@/api";
import { getErrorMessage } from "@/utils/errors";
import Gate from "@/brokerTools/gate";
import IssueTermSheet from "./IssueTermSheet";
import ConditionsChecklist from "./ConditionsChecklist";

type Mode = "lender" | "template" | "ours";
export type Revenue = {
  spread: number | null; broker_fee: number; setup_fee: number; proceeds_fee: number; lender_commission: number; total: number;
  funds_to_client: number | null; client_payment: number | null; client_total_repaid: number | null; term_months: number | null; note: string | null;
};
export type FileOffer = {
  id: string; lender_name: string; amount: string | number | null; rate_factor: string | null; term: string | null;
  payment_frequency: string | null; expiry_date: string | null; document_url: string | null; status: string; created_at?: string;
  expired?: boolean; has_amount?: boolean; // BF_PORTAL_v947 - from the server: past its expiry date / no amount yet
  term_sheet_mode?: Mode | null; client_rate?: string | null; term_months?: number | null; broker_fee?: string | null;
  setup_fee?: string | null; proceeds_fee?: string | null; lender_commission?: string | null; has_lender_term_sheet?: boolean;
  revenue?: Revenue | null;
};

const dollars = (n: number | null | undefined): string =>
  n === null || n === undefined || !Number.isFinite(n) ? "—" : n.toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });
export function money(v: unknown): string {
  const n = Number(String(v ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n.toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }) : "";
}

const stepCard: CSSProperties = { border: "1px solid var(--ui-border)", borderRadius: 14, background: "var(--ui-surface-strong)", color: "var(--ui-text)", marginBottom: 14 };
const btn: CSSProperties = { padding: "7px 13px", borderRadius: 8, border: "1px solid var(--ui-border)", background: "var(--ui-surface)", color: "var(--ui-text)", fontWeight: 600, fontSize: 13, cursor: "pointer" };
const primary: CSSProperties = { ...btn, background: "#1e3a8a", borderColor: "#1e3a8a", color: "#fff" };
const link: CSSProperties = { ...btn, border: 0, background: "transparent", color: "#1e3a8a", padding: "7px 4px" };
const inp: CSSProperties = { padding: "7px 9px", borderRadius: 8, border: "1px solid var(--ui-border)", background: "var(--ui-surface)", color: "var(--ui-text)", fontSize: 13, width: 140 };
const field: CSSProperties = { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--ui-text-muted)" };
const pill = (bg: string, fg: string): CSSProperties => ({ padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: bg, color: fg });

const SEND_STATE: Record<string, { label: string; bg: string; fg: string }> = {
  pending: { label: "Not sent yet", bg: "#eef0f4", fg: "#4b5563" },
  pending_acceptance: { label: "Sent. Waiting for the client to sign", bg: "#fef3c7", fg: "#92400e" },
  accepted: { label: "Signed by the client", bg: "#dcfce7", fg: "#166534" },
  rejected: { label: "Declined by the client", bg: "#fee2e2", fg: "#991b1b" },
  changes_requested: { label: "The client asked for changes", bg: "#dbeafe", fg: "#1e40af" },
};

function Step({ n, title, state, summary, children, testId }: { n: number; title: string; state: "open" | "done" | "wait"; summary?: ReactNode; children?: ReactNode; testId: string }) {
  const dot: CSSProperties = { width: 28, height: 28, borderRadius: "50%", flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14,
    background: state === "done" ? "#15803d" : state === "wait" ? "var(--ui-border)" : "#1e3a8a", color: state === "wait" ? "var(--ui-text-muted)" : "#fff" };
  return (
    <section style={stepCard} data-testid={testId} data-state={state}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", flexWrap: "wrap" }}>
        <div style={dot} aria-hidden="true">{state === "done" ? "✓" : n}</div>
        <h3 style={{ margin: 0, fontSize: 16, color: state === "wait" ? "var(--ui-text-muted)" : undefined }}>{title}</h3>
        {summary ? <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", fontSize: 13, color: "var(--ui-text-muted)" }}>{summary}</div> : null}
      </div>
      {children ? <div style={{ padding: "2px 16px 16px 56px" }}>{children}</div> : null}
    </section>
  );
}

const PRICE_KEYS = ["client_rate", "term_months", "broker_fee", "setup_fee", "proceeds_fee", "lender_commission"] as const;
type PriceKey = (typeof PRICE_KEYS)[number];

/** Change a saved term sheet: which sheet the client gets, our rate, the fees. Shows what we earn after saving. */
export function ChangeTerms({ offer, onSaved, onClose }: { offer: FileOffer; onSaved: () => void; onClose: () => void }) {
  const hasLender = offer.term_sheet_mode !== "ours";
  const [template, setTemplate] = useState(offer.term_sheet_mode === "template" || offer.term_sheet_mode === "ours");
  const [vals, setVals] = useState<Record<PriceKey, string>>(() => Object.fromEntries(PRICE_KEYS.map((k) => [k, offer[k] === null || offer[k] === undefined ? "" : String(offer[k])])) as Record<PriceKey, string>);
  const [rev, setRev] = useState<Revenue | null>(offer.revenue ?? null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const set = (k: PriceKey) => (e: React.ChangeEvent<HTMLInputElement>) => setVals((v) => ({ ...v, [k]: e.target.value }));
  const mode: Mode = !hasLender ? "ours" : template ? "template" : "lender";

  async function save() {
    setBusy(true); setMsg(null);
    try {
      const body: Record<string, unknown> = { term_sheet_mode: mode };
      for (const k of PRICE_KEYS) body[k] = vals[k].trim() === "" ? null : vals[k].trim();
      if (mode === "lender") body.client_rate = null;
      const r = await api.patch<{ offer?: { revenue?: Revenue } }>(`/api/offers/${encodeURIComponent(offer.id)}/pricing`, body);
      setRev(r?.offer?.revenue ?? null);
      if (mode !== "lender") {
        try { await api.post(`/api/licensee-documents/offers/${encodeURIComponent(offer.id)}/term-sheet`, {}); }
        catch (e) { setMsg({ ok: false, text: getErrorMessage(e, "Saved, but your template could not be filled in. Upload it in Settings > Term sheet templates.") }); onSaved(); return; }
      }
      setMsg({ ok: true, text: "Saved." });
      onSaved();
    } catch (e) { setMsg({ ok: false, text: getErrorMessage(e, "That could not be saved. Try again.") }); }
    finally { setBusy(false); }
  }

  const lines: Array<[string, number | null]> = rev ? [["Rate difference", rev.spread], ["Broker fee", rev.broker_fee], ["Set-up fee", rev.setup_fee], ["Fee from the funds", rev.proceeds_fee], ["Lender pays us", rev.lender_commission]] : [];
  return (
    <div data-testid={`change-${offer.id}`} style={{ padding: 12, margin: "8px 0 4px", background: "var(--ui-surface)", borderRadius: 10, border: "1px solid var(--ui-border)" }}>
      {hasLender ? (
        <div role="radiogroup" aria-label="Which term sheet the client gets" style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: 13 }}>
          <label><input type="radio" name={`sheet-${offer.id}`} checked={!template} disabled={!offer.has_lender_term_sheet} onChange={() => setTemplate(false)} /> The lender&apos;s term sheet</label>
          <label><input type="radio" name={`sheet-${offer.id}`} data-testid={`change-template-${offer.id}`} checked={template} onChange={() => setTemplate(true)} /> Our term sheet template</label>
        </div>
      ) : <p style={{ margin: 0, fontSize: 13 }}>Our term sheet template (no outside lender).</p>}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 10 }}>
        {mode !== "lender" ? <label style={field}>Our rate to the client<input style={inp} value={vals.client_rate} onChange={set("client_rate")} placeholder={offer.rate_factor ? `lender: ${offer.rate_factor}` : ""} aria-label="Our rate to the client" /></label> : null}
        <label style={field}>Term (months)<input style={inp} value={vals.term_months} onChange={set("term_months")} placeholder={offer.term || ""} aria-label="Term in months" /></label>
        <label style={field}>Our broker fee ($)<input style={inp} value={vals.broker_fee} onChange={set("broker_fee")} aria-label="Broker fee" /></label>
        <label style={field}>Set-up fee ($)<input style={inp} value={vals.setup_fee} onChange={set("setup_fee")} aria-label="Set-up fee" /></label>
        <label style={field}>Fee taken from the funds ($)<input style={inp} value={vals.proceeds_fee} onChange={set("proceeds_fee")} aria-label="Fee from proceeds" /></label>
        {hasLender ? <label style={field}>Lender pays us ($)<input style={inp} value={vals.lender_commission} onChange={set("lender_commission")} aria-label="Lender commission" /></label> : null}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button type="button" style={primary} disabled={busy} onClick={() => void save()} data-testid={`change-save-${offer.id}`}>{busy ? "Saving…" : "Save"}</button>
        <button type="button" style={btn} onClick={onClose}>Close</button>
      </div>
      {msg ? <div role={msg.ok ? "status" : "alert"} style={{ fontSize: 12, marginTop: 6, color: msg.ok ? "#166534" : "#b91c1c" }}>{msg.text}</div> : null}
      {rev ? (
        <div data-testid={`revenue-${offer.id}`} style={{ marginTop: 12, display: "flex", gap: 20, flexWrap: "wrap", fontSize: 13 }}>
          <div><div style={{ fontSize: 11, color: "var(--ui-text-muted)" }}>What we earn on this deal</div><div style={{ fontWeight: 700 }}>{dollars(rev.total)}</div></div>
          {lines.filter(([, v]) => v).map(([l, v]) => <div key={l}><div style={{ fontSize: 11, color: "var(--ui-text-muted)" }}>{l}</div><div>{dollars(v)}</div></div>)}
          {rev.proceeds_fee ? <div><div style={{ fontSize: 11, color: "var(--ui-text-muted)" }}>Client receives</div><div>{dollars(rev.funds_to_client)}</div></div> : null}
          {rev.client_payment ? <div><div style={{ fontSize: 11, color: "var(--ui-text-muted)" }}>Client payment a month</div><div>{dollars(rev.client_payment)}</div></div> : null}
          {rev.note ? <div style={{ flexBasis: "100%", color: "#92400e" }}>{rev.note}</div> : null}
        </div>
      ) : null}
    </div>
  );
}

/** "Northern Capital · $250,000 · 13.4% · 36 months · Monthly", leaving out what is not known. */
export function termsLine(o: FileOffer): string {
  const parts = [money(o.amount), o.client_rate || o.rate_factor || "", o.term || (o.term_months ? `${o.term_months} months` : ""), o.payment_frequency || ""].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Figures not entered yet: press Change";
}

export default function OfferTab({ applicationId }: { applicationId: string }) {
  const [offers, setOffers] = useState<FileOffer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Record<string, { ok: boolean; text: string }>>({});
  const [changing, setChanging] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [conditionsKey, setConditionsKey] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ items?: FileOffer[] }>(`/api/offers?applicationId=${encodeURIComponent(applicationId)}`);
      setOffers(Array.isArray(res?.items) ? res.items : []);
      setError(null);
    } catch (e) { setError(getErrorMessage(e, "Could not load the term sheets on this file.")); setOffers([]); }
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
      setMsgs((m) => ({ ...m, [o.id]: { ok: false, text: getErrorMessage(e, "The term sheet could not be sent. Try again.") } }));
    } finally { setBusy(null); }
  }

  // A Word term sheet opened as a PDF failed to load; the server's view link shows Word files as a readable page.
  async function viewTermSheet(o: FileOffer) {
    const w = window.open("", "_blank"); // opened now, before the request, so the browser does not block it
    try {
      const r = await api.post<{ url?: string }>(`/api/offers/${encodeURIComponent(o.id)}/term-sheet-link`, {});
      const url = r?.url ?? o.document_url ?? "";
      if (w) w.location.href = url; else window.open(url, "_blank");
    } catch {
      if (w && o.document_url) w.location.href = o.document_url; else w?.close();
    }
  }

  const list = offers ?? [];
  const has = list.length > 0;
  const showForm = offers !== null && (!has || adding);
  const removeSheet = async (o: FileOffer) => {
    const name = o.term_sheet_mode === "ours" ? "our term sheet" : `the ${o.lender_name} term sheet`;
    if (!window.confirm(`Remove ${name} from this file? Its conditions that nobody has acted on are removed too. The client will no longer see it.`)) return;
    setBusy(o.id);
    try {
      await api.delete(`/api/offers/${encodeURIComponent(o.id)}`);
      setConditionsKey((k) => k + 1);
      await load();
    } catch (e) {
      setMsgs((m) => ({ ...m, [o.id]: { ok: false, text: getErrorMessage(e, "The term sheet could not be removed.") } }));
    } finally { setBusy(null); }
  };
  const sendable = list.filter((o) => !o.expired && o.has_amount !== false);
  const allSent = has && sendable.length > 0 && sendable.every((o) => o.status !== "pending");
  const signed = list.some((o) => o.status === "accepted");
  const sheetKind = (o: FileOffer) => (o.term_sheet_mode === "ours" ? "Our term sheet, no lender named" : o.term_sheet_mode === "template" ? "On our template" : "The lender's term sheet");

  return (
    <div data-testid="offer-tab" style={{ maxWidth: 1200 }}>
      {error ? <p role="alert" style={{ fontSize: 13, color: "#b91c1c" }}>{error}</p> : null}

      <Step n={1} title="Term sheet" testId="offer-step-1" state={has && !adding ? "done" : "open"}
        summary={has && !adding ? <button type="button" style={btn} data-testid="offer-add-another" onClick={() => setAdding(true)}>+ Add another term sheet</button> : undefined}>
        {offers === null ? <p style={{ fontSize: 13, color: "var(--ui-text-muted)" }}>Loading…</p> : null}
        {list.map((o) => (
          <div key={o.id} data-testid={`offer-row-${o.id}`} style={{ borderTop: "1px solid var(--ui-border)", padding: "10px 0" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 260 }}>
                <div style={{ fontSize: 14 }}><strong>{o.term_sheet_mode === "ours" ? "Funded by us" : o.lender_name}</strong> · {termsLine(o)}</div>
                <div style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>
                  {sheetKind(o)}{o.expiry_date ? ` · expires ${String(o.expiry_date).slice(0, 10)}` : ""}
                  {o.revenue && o.revenue.total > 0 ? <> · we earn <strong data-testid={`offer-revenue-${o.id}`} style={{ color: "var(--ui-text)" }}>{dollars(o.revenue.total)}</strong></> : null}
                </div>
              </div>
              {o.document_url ? <button type="button" style={link} onClick={() => void viewTermSheet(o)} data-testid={`offer-view-${o.id}`}>View</button> : null}
              <button type="button" style={link} aria-expanded={changing === o.id} data-testid={`offer-change-${o.id}`} onClick={() => setChanging(changing === o.id ? null : o.id)}>Change</button>
              {/* BF_PORTAL_v947 - take a term sheet off the file (uploaded by mistake, replaced). A signed one stays. */}
              {o.status === "accepted" ? null : <button type="button" style={{ ...link, color: "#b91c1c" }} data-testid={`offer-remove-${o.id}`} disabled={busy === o.id} onClick={() => void removeSheet(o)}>Remove</button>}
            </div>
            {changing === o.id ? <ChangeTerms offer={o} onSaved={() => void load()} onClose={() => setChanging(null)} /> : null}
          </div>
        ))}
        {showForm ? (
          <div style={{ borderTop: has ? "1px solid var(--ui-border)" : undefined, paddingTop: has ? 12 : 0 }}>
            <IssueTermSheet applicationId={applicationId} onCancel={has ? () => setAdding(false) : undefined}
              onSaved={() => { setAdding(false); setConditionsKey((k) => k + 1); void load(); }} />
          </div>
        ) : null}
        {list.filter((o) => !o.expired && o.has_amount !== false).length > 1 ? <p style={{ fontSize: 12, color: "var(--ui-text-muted)", margin: "6px 0 0" }}>The client sees the ones that are complete and not expired side by side, and picks one.</p> : null}
      </Step>

      <Step n={2} title="Send to the client" testId="offer-step-2" state={!has ? "wait" : allSent ? "done" : "open"} summary={!has ? "After step 1" : undefined}>
        {has ? list.map((o) => {
          const st = SEND_STATE[o.status] ?? { label: o.status, bg: "#eef0f4", fg: "#4b5563" };
          const sent = o.status !== "pending";
          const m = msgs[o.id];
          return (
            <div key={o.id} style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", padding: "6px 0" }}>
              {list.length > 1 ? <strong style={{ fontSize: 14, minWidth: 160 }}>{o.term_sheet_mode === "ours" ? "Funded by us" : o.lender_name}</strong> : null}
              <span style={pill(st.bg, st.fg)} data-testid={`offer-state-${o.id}`}>{st.label}</span>
              {/* BF_PORTAL_v947 - an expired term sheet, or one with no amount, is never sent and the client never sees it. */}
              {o.status !== "accepted" && o.expired ? <span style={pill("#fee2e2", "#991b1b")} data-testid={`offer-expired-${o.id}`}>Expired: the client does not see it. Change the expiry date in step 1 to send it.</span> : null}
              {o.status !== "accepted" && !o.expired && o.has_amount === false ? <span style={pill("#fee2e2", "#991b1b")} data-testid={`offer-incomplete-${o.id}`}>No amount yet: fill in its terms in step 1 to send it.</span> : null}
              {o.status === "accepted" || o.expired || o.has_amount === false ? null : (
                <button type="button" data-testid={`offer-send-${o.id}`} style={sent ? btn : primary} disabled={busy === o.id} aria-busy={busy === o.id} onClick={() => void send(o)}>
                  {busy === o.id ? "Sending…" : sent ? "Send again" : "Send to the client for signature"}
                </button>
              )}
              {m ? <span role={m.ok ? "status" : "alert"} style={{ fontSize: 13, color: m.ok ? "#166534" : "#b91c1c" }}>{m.text}</span> : null}
            </div>
          );
        }) : null}
        {signed ? <p style={{ fontSize: 13, color: "var(--ui-text-muted)", margin: "6px 0 0" }}>Signed. Record the funding on the Close tab once the conditions below are done.</p> : null}
      </Step>

      <Gate feature="funding_conditions">
        <Step n={3} title="Conditions before funding" testId="offer-step-3" state={has ? "open" : "wait"} summary={!has ? "After step 1" : undefined}>
          {has && !signed && list.length > 1 ? <p data-testid="conditions-before-signing" style={{ fontSize: 13, color: "var(--ui-text-muted)", margin: "0 0 8px" }}>These are the conditions from every term sheet on the file. The client sees none of them yet. Once the client signs one, only that term sheet's conditions stay on this list and show in the client's app.</p> : null}
          {has ? <ConditionsChecklist applicationId={applicationId} reloadKey={conditionsKey} /> : null}
        </Step>
      </Gate>
    </div>
  );
}
