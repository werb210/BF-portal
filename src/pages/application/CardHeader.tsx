// BF_PORTAL_v938_CARD_REDESIGN - the slim header on every tab of an application card (Todd and Andrew, Nov 11 2026):
// business name, the key numbers (requested amount, product, offers received, assigned broker), the "Referred by" chip
// (click for where the file came from), the Next step button and a ⋯ menu for Hold, Reject and Fraud, the loan
// with the loan calculator and the QuickBooks fee invoice beside it. No stage chip, no progress bar, no forecast.
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { api } from "@/api";
import { getErrorMessage } from "@/utils/errors";
import { RejectReasonsModal } from "@/components/applications/RejectReasonsModal";
import CalculatorButton, { amountFrom } from "@/features/loanCalculator/CalculatorButton";
import QuickBooksInvoiceBadge from "@/features/quickbooks/QuickBooksInvoiceBadge";
import { createApplicationNote } from "@/api/applicationNotes";
import OriginChip from "./OriginChip";
import { NEXT_STEP_EVENT, nextStepFor, offerStateOf, type OfferState } from "./nextStep";

type AnyRecord = Record<string, any>;

const wrap: CSSProperties = { padding: "12px 20px", borderBottom: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)", flexShrink: 0 };
const row: CSSProperties = { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" };
const back: CSSProperties = { border: 0, background: "transparent", color: "var(--ui-accent-fg)", fontSize: 13, cursor: "pointer", padding: 0, fontFamily: "inherit", fontWeight: 500 };
const title: CSSProperties = { margin: 0, fontSize: 20, fontWeight: 700, color: "var(--ui-text)" };
const kpis: CSSProperties = { display: "flex", gap: 28, flexWrap: "wrap", marginTop: 8 };
const kpiLabel: CSSProperties = { fontSize: 11, color: "var(--ui-text-muted)", textTransform: "uppercase", letterSpacing: ".04em" };
const kpiValue: CSSProperties = { fontSize: 15, fontWeight: 600, color: "var(--ui-text)" };
const primary: CSSProperties = { padding: "8px 14px", borderRadius: 8, border: "1px solid #1e3a8a", background: "#1e3a8a", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" };
const plain: CSSProperties = { padding: "8px 12px", borderRadius: 8, border: "1px solid var(--ui-border)", background: "var(--ui-surface)", color: "var(--ui-text)", fontWeight: 600, fontSize: 13, cursor: "pointer" };
const menu: CSSProperties = { position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 30, background: "var(--ui-surface-strong)", border: "1px solid var(--ui-border)", borderRadius: 10, boxShadow: "0 10px 30px rgba(0,0,0,.15)", padding: 6, width: 230 };
const item: CSSProperties = { display: "block", width: "100%", textAlign: "left", padding: "8px 10px", border: 0, background: "transparent", borderRadius: 6, fontSize: 13, color: "var(--ui-text)", cursor: "pointer", fontFamily: "inherit" };

export function businessName(application: AnyRecord | null): string {
  const a = application ?? {};
  return String(a.businessDetails?.legalName ?? a.business?.legalName ?? a.businessDetails?.name ?? a.business?.name ?? a.overview?.name ?? a.applicant ?? "").trim() || "Application";
}

function money(v: unknown): string {
  const n = Number(String(v ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n.toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }) : "—";
}

function pretty(v: unknown): string {
  const s = String(v ?? "").trim();
  if (!s) return "—";
  return s.replace(/[_-]+/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function CardHeader({ applicationId, application, onNavigate }: {
  applicationId: string;
  application: AnyRecord | null;
  onNavigate: (to: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (menuRef.current && e.target instanceof Node && !menuRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const a = application ?? {};
  const fp = (a.financialProfile ?? a.kyc ?? {}) as AnyRecord;
  const requested = amountFrom(a.overview?.requestedAmount, a.fundingRequest?.amount, fp.fundingAmount, a.requestedAmount, a.requested_amount);
  const product = a.overview?.productCategory ?? a.productCategory ?? a.overview?.productType;
  const offers = Number(a.offerCount ?? 0);
  const broker = a.assignedTo?.name ?? null;
  const name = businessName(application);
  const stage = String(a.stage ?? "");
  const parked = stage === "Hold" || stage === "Fraud";
  // BF_PORTAL_v946_OFFER_STEPS - at the Offer stage the button follows the term sheets: add, send, waiting, conditions.
  const [offerState, setOfferState] = useState<OfferState | undefined>(undefined);
  const [offersTick, setOffersTick] = useState(0);
  useEffect(() => { const on = () => setOffersTick((n) => n + 1); window.addEventListener("bf:offers-changed", on); return () => window.removeEventListener("bf:offers-changed", on); }, []);
  const atOffer = stage.trim().toLowerCase() === "offer";
  useEffect(() => {
    if (!atOffer || !applicationId) { setOfferState(undefined); return; }
    let cancelled = false;
    api.get<{ items?: Array<{ status?: string; expired?: boolean; has_amount?: boolean }> }>(`/api/offers?applicationId=${encodeURIComponent(applicationId)}`)
      .then((r) => { if (!cancelled) setOfferState(offerStateOf(Array.isArray(r?.items) ? r.items : [])); })
      .catch(() => { if (!cancelled) setOfferState(undefined); });
    return () => { cancelled = true; };
  }, [atOffer, applicationId, offers, offersTick]);
  const next = nextStepFor({ stage, signing: a.signing?.status ?? null, offers, offerState });

  // Parking removes the file from the reported numbers, so it is never one click, and the reason is required
  // (the client is emailed a Hold reason).
  async function park(to: "Hold" | "Fraud") {
    setOpen(false);
    const prompt = to === "Fraud"
      ? "Mark this application as FRAUD?\n\nIt is removed from commission and every report and can no longer be sent to a lender. The file and its history are kept.\n\nReason (required):"
      : "Put this application on HOLD?\n\nIt drops out of live pipeline and commission figures until reactivated.\n\nThe client is emailed this reason, so write it for them to read.\n\nReason (required):";
    const entered = window.prompt(prompt, "");
    if (entered === null) return;
    const reason = entered.trim();
    if (reason.length < 3) { setMsg({ ok: false, text: `A reason is required to ${to === "Hold" ? "put a file on hold" : "mark a file as fraud"}.` }); return; }
    setBusy(to); setMsg(null);
    try {
      await api.patch(`/api/portal/applications/${encodeURIComponent(applicationId)}/status`, { status: to, reason });
      window.location.assign("/pipeline");
    } catch (e) {
      setMsg({ ok: false, text: getErrorMessage(e, `Unable to move this application to ${to}.`) });
    } finally { setBusy(null); }
  }

  async function reactivate() {
    setOpen(false);
    if (!window.confirm("Reactivate this application and return it to the stage it came from?")) return;
    setBusy("revive"); setMsg(null);
    try {
      const rec = await api.get<AnyRecord>(`/api/portal/applications/${encodeURIComponent(applicationId)}`);
      const backTo = rec?.application?.parkedPreviousStage || "In Review";
      await api.patch(`/api/portal/applications/${encodeURIComponent(applicationId)}/status`, { status: backTo, reason: `Reactivated from ${stage}` });
      window.location.reload();
    } catch (e) {
      setMsg({ ok: false, text: getErrorMessage(e, "Unable to reactivate this application.") });
    } finally { setBusy(null); }
  }

  async function reject(codes: string[], note: string) {
    setBusy("reject"); setMsg(null);
    try {
      const res: AnyRecord = await api.post(`/api/applications/${encodeURIComponent(applicationId)}/reject`, { reasonCodes: codes, note });
      const d = (res?.data ?? res) ?? {};
      setRejectOpen(false);
      setMsg({ ok: true, text: d.emailed ? "Application rejected. The applicant has been emailed the reasons." : "Application rejected. The reasons are recorded, but the email did not send." });
    } catch (e) {
      setMsg({ ok: false, text: getErrorMessage(e, "Unable to reject the application.") });
    } finally { setBusy(null); }
  }

  return (
    <div style={wrap} data-testid="card-header">
      <div style={row}>
        <button type="button" onClick={() => onNavigate("/pipeline")} style={back}>← Pipeline</button>
      </div>
      <div style={{ ...row, marginTop: 6 }}>
        <h1 style={title} data-testid="card-title">{name}</h1>
        <OriginChip applicationId={applicationId} />
        {parked ? <span data-testid="card-parked" style={{ padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: "#fef3c7", color: "#92400e" }}>{stage}</span> : null}
        <span style={{ flex: 1 }} />
        {applicationId ? <QuickBooksInvoiceBadge applicationId={applicationId} /> : null}
        <CalculatorButton requestedAmount={requested} title={name} onSaveNote={applicationId ? async (text: string) => { await createApplicationNote(applicationId, text); } : undefined} />
        {next ? (
          <button type="button" data-testid="next-step" style={primary} onClick={() => { onNavigate(`/applications/${applicationId}/${next.tab}`); window.setTimeout(() => window.dispatchEvent(new CustomEvent(NEXT_STEP_EVENT, { detail: { tab: next.tab } })), 150); }}>
            {next.waiting ? next.label : <>Next: {next.label} →</>}
          </button>
        ) : null}
        <div ref={menuRef} style={{ position: "relative" }}>
          <button type="button" aria-label="More actions" aria-haspopup="menu" aria-expanded={open} data-testid="card-menu" style={plain} onClick={() => setOpen((v) => !v)} disabled={busy !== null}>⋯</button>
          {open ? (
            <div role="menu" style={menu}>
              {parked
                ? <button role="menuitem" type="button" style={item} onClick={() => void reactivate()}>↺ Reactivate</button>
                : <>
                    <button role="menuitem" type="button" style={item} onClick={() => void park("Hold")}>⏸ Hold (with reason)</button>
                    <button role="menuitem" type="button" style={{ ...item, color: "#b91c1c" }} onClick={() => void park("Fraud")}>⚠ Mark as fraud</button>
                  </>}
              <button role="menuitem" type="button" data-testid="card-reject" style={{ ...item, color: "#b91c1c" }} onClick={() => { setOpen(false); setRejectOpen(true); }}>✕ Reject (with reasons)</button>
            </div>
          ) : null}
        </div>
      </div>
      <div style={kpis}>
        <div><div style={kpiLabel}>Requested</div><div style={kpiValue} data-testid="kpi-requested">{money(requested)}</div></div>
        <div><div style={kpiLabel}>Product</div><div style={kpiValue} data-testid="kpi-product">{pretty(product)}</div></div>
        <div><div style={kpiLabel}>Offers</div><div style={kpiValue} data-testid="kpi-offers">{offers}</div></div>
        <div><div style={kpiLabel}>Broker</div><div style={kpiValue} data-testid="kpi-broker">{broker ?? "Unassigned"}</div></div>
      </div>
      {msg ? <div role={msg.ok ? "status" : "alert"} style={{ marginTop: 8, fontSize: 13, color: msg.ok ? "#166534" : "#b91c1c" }}>{msg.text}</div> : null}
      {rejectOpen ? (
        <RejectReasonsModal mode="application" busy={busy === "reject"} onCancel={() => setRejectOpen(false)} onSubmit={(codes, note) => void reject(codes, note)} />
      ) : null}
    </div>
  );
}
