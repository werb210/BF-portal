// BF_PORTAL_v938_CARD_REDESIGN - the application card, reorganised with Todd and Andrew (Nov 11 2026):
//   Overview      - Application · Financials · Banking analysis
//   Documents     - Documents · Credit summary · Fraud check (ID verification results sit at the bottom of Fraud check
//                   once ID is requested or uploaded - v941; the ID check service is set up in Settings)
//   Request Items - unchanged
//   Notes         - notes, with the questions for the lender beside them
//   Lenders       - match and send
//   Offer         - give the client a term sheet (the lender's, the lender's terms on ours, or ours), conditions, signing
//   Close         - once a term sheet is signed: what funded and how we are paid (BF_PORTAL_v942_CLOSE_TAB)
// One slim header on every tab (CardHeader). Removed: Quotes, Deal desk, the forecast panel and the "Where this came from"
// box (now a chip in the header). The URL stays /applications/:id/<sub-tab>; old links (quotes, deal-desk, funding)
// land on the nearest new place.
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { api } from "@/api";
import ApplicationTab from "@/pages/applications/tabs/ApplicationTab";
import BankingAnalysisTab from "@/pages/applications/tabs/BankingAnalysisTab";
import FinancialsTab from "@/pages/applications/tabs/FinancialsTab";
import DocumentsTab from "@/pages/applications/tabs/DocumentsTab";
import CreditSummaryTab from "@/pages/applications/tabs/CreditSummaryTab";
import RequestItemsTab from "@/pages/applications/tabs/RequestItemsTab";
import NotesTab from "@/pages/applications/tabs/NotesTab";
import LendersTab from "@/pages/applications/tabs/LendersTab";
import SbaSigningTab from "@/pages/applications/tabs/SbaSigningTab";
import FraudTab from "@/fraud/FraudTab";
import IdVerificationTab from "@/kyc/IdVerificationTab";
import CardHeader from "./CardHeader";
import OfferTab from "./OfferTab";
import CloseTab from "./CloseTab"; // BF_PORTAL_v942_CLOSE_TAB

type SubTab = { key: string; label: string };
type MainTab = { key: string; label: string; subs: SubTab[] };

export const CARD_TABS: MainTab[] = [
  { key: "overview", label: "Overview", subs: [
    { key: "application", label: "Application" },
    { key: "financials", label: "Financials" },
    { key: "banking-analysis", label: "Banking analysis" },
  ] },
  { key: "documents-group", label: "Documents", subs: [
    { key: "documents", label: "Documents" },
    { key: "credit-summary", label: "Credit summary" },
    { key: "fraud", label: "Fraud check" },
    { key: "sba-signing", label: "SBA signing" },
  ] },
  { key: "request-items-group", label: "Request Items", subs: [{ key: "request-items", label: "Request Items" }] },
  { key: "notes-group", label: "Notes", subs: [{ key: "notes", label: "Notes" }] },
  // BF_PORTAL_v943_OFFER_OWN_TAB - Todd: "Offer (should be it's own tab)"; Close follows once a term sheet is signed.
  { key: "lenders-group", label: "Lenders", subs: [{ key: "lenders", label: "Lenders" }] },
  { key: "offer-group", label: "Offer", subs: [{ key: "offer", label: "Offer" }] },
  { key: "close-group", label: "Close", subs: [{ key: "close", label: "Close" }] },
];

const ALIASES: Record<string, string> = { quotes: "offer", funding: "offer", "deal-desk": "application", "id-verification": "fraud" };

export function activeSubFromPath(pathname: string): string {
  const seg = pathname.split("/").filter(Boolean).at(-1) ?? "application";
  const key = ALIASES[seg] ?? seg;
  return CARD_TABS.some((t) => t.subs.some((s) => s.key === key)) ? key : "application";
}

export function mainFor(sub: string): MainTab {
  return CARD_TABS.find((t) => t.subs.some((s) => s.key === sub)) ?? CARD_TABS[0]!;
}

/** Close shows once the client has signed a term sheet (an accepted offer) or a close was saved. */
function useShowClose(applicationId: string): boolean {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!applicationId) return;
    let cancelled = false;
    setShow(false);
    void (async () => {
      try {
        const c = await api.get<{ saved?: boolean }>(`/api/deals/applications/${encodeURIComponent(applicationId)}/close`);
        if (!cancelled && c?.saved) { setShow(true); return; }
      } catch { /* older server */ }
      try {
        const o = await api.get<{ items?: Array<{ status?: string }> }>(`/api/offers?applicationId=${encodeURIComponent(applicationId)}`);
        if (!cancelled && (o?.items ?? []).some((x) => x.status === "accepted")) setShow(true);
      } catch { /* leave hidden */ }
    })();
    return () => { cancelled = true; };
  }, [applicationId]);
  return show;
}

const ID_DOC = /\b(id|government|photo id|driver|passport|identification)\b/i;

/** ID verification shows once a check was requested or the client uploaded ID. */
function useShowIdVerification(applicationId: string): boolean {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!applicationId) return;
    let cancelled = false;
    setShow(false);
    void (async () => {
      try {
        const k = await api.get<{ verifications?: unknown[] }>(`/api/kyc/applications/${encodeURIComponent(applicationId)}`);
        if (!cancelled && Array.isArray(k?.verifications) && k.verifications.length > 0) { setShow(true); return; }
      } catch { /* not connected or no checks yet */ }
      try {
        const r = await api.get<{ documents?: Array<{ category?: string | null; document_type?: string | null }> }>(`/api/portal/applications/${encodeURIComponent(applicationId)}`);
        const has = (r?.documents ?? []).some((d) => ID_DOC.test(String(d.category ?? d.document_type ?? "")));
        if (!cancelled && has) setShow(true);
      } catch { /* leave hidden */ }
    })();
    return () => { cancelled = true; };
  }, [applicationId]);
  return show;
}

const tabBtn = (active: boolean, sub = false): CSSProperties => ({
  border: 0,
  borderBottom: active ? `${sub ? 2 : 3}px solid var(--ui-accent-fg)` : `${sub ? 2 : 3}px solid transparent`,
  background: "transparent",
  color: active ? "var(--ui-accent-fg)" : "var(--ui-text-soft)",
  fontWeight: active ? 700 : 500,
  padding: sub ? "6px 4px" : "10px 6px",
  cursor: "pointer",
  whiteSpace: "nowrap",
  fontSize: sub ? 13 : 15,
  fontFamily: "inherit",
});

export default function ApplicationDetail({ applicationId: propId }: { applicationId?: string }) {
  const { id: routeId } = useParams<{ id: string }>();
  const applicationId = propId ?? routeId ?? "";
  const location = useLocation();
  const navigate = useNavigate();
  const [application, setApplication] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activeSub = activeSubFromPath(location.pathname);
  const activeMain = mainFor(activeSub);
  const showId = useShowIdVerification(applicationId);
  const showClose = useShowClose(applicationId);

  // BF_PORTAL_v906_SBA_TAB_ONLY_SBA - SBA signing shows only on an SBA file (BF-Server decides: isSba on /sba-signing).
  const [isSba, setIsSba] = useState(false);
  useEffect(() => {
    if (!applicationId) return;
    let cancelled = false;
    setIsSba(false);
    api.get<any>(`/api/applications/${encodeURIComponent(applicationId)}/sba-signing`)
      .then((r) => { if (!cancelled) setIsSba(Boolean((r?.data ?? r)?.isSba)); })
      .catch(() => { if (!cancelled) setIsSba(false); });
    return () => { cancelled = true; };
  }, [applicationId]);

  useEffect(() => {
    if (!applicationId) return;
    setError(null);
    api
      .get(`/api/applications/${applicationId}/details`)
      .then((payload: any) => setApplication(payload?.data ?? payload?.application ?? payload ?? null))
      .catch((err: any) => setError(err?.message ?? "Could not load application."));
  }, [applicationId]);

  const visibleSubs = useMemo(() => activeMain.subs.filter((s) => {
    if (s.key === "sba-signing") return isSba || activeSub === "sba-signing";
    return true;
  }), [activeMain, isSba, showId, activeSub]);

  const go = (sub: string) => navigate(`/applications/${applicationId}/${sub}`);

  const body: Record<string, JSX.Element> = {
    application: <ApplicationTab application={application} />,
    financials: <FinancialsTab applicationId={applicationId} />,
    "banking-analysis": <BankingAnalysisTab applicationId={applicationId} />,
    documents: <DocumentsTab applicationId={applicationId} />,
    "credit-summary": <CreditSummaryTab applicationId={applicationId} />,
    // BF_PORTAL_v941_ID_IN_FRAUD - Todd: "the ID verification tab should not exist"; its results show in Fraud check.
    fraud: <><FraudTab applicationId={applicationId} />{showId ? <div style={{ marginTop: 20 }}><IdVerificationTab applicationId={applicationId} /></div> : null}</>,
    "sba-signing": <SbaSigningTab applicationId={applicationId} />,
    "request-items": <RequestItemsTab applicationId={applicationId} />,
    notes: <NotesTab applicationId={applicationId} />,
    lenders: <LendersTab applicationId={applicationId} hideParkButtons />,
    offer: <OfferTab applicationId={applicationId} />,
    close: <CloseTab applicationId={applicationId} />,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {error && (
        <div style={{ margin: 0, padding: "10px 20px", color: "#b91c1c", background: "#fef2f2", borderBottom: "1px solid #fecaca", fontSize: 14, flexShrink: 0 }}>
          {error}
        </div>
      )}
      <CardHeader applicationId={applicationId} application={application} onNavigate={(to) => navigate(to)} />
      <nav data-testid="card-tabs" style={{ display: "flex", gap: 18, padding: "0 20px", borderBottom: "1px solid var(--ui-border)", overflowX: "auto", background: "var(--ui-surface-strong)", flexShrink: 0 }}>
        {CARD_TABS.filter((t) => t.key !== "close-group" || showClose || activeSub === "close").map((t) => (
          <button key={t.key} type="button" style={tabBtn(t.key === activeMain.key)} onClick={() => go(t.subs[0]!.key)}>{t.label}</button>
        ))}
      </nav>
      {visibleSubs.length > 1 ? (
        <nav data-testid="card-subtabs" style={{ display: "flex", gap: 16, padding: "0 20px", borderBottom: "1px solid var(--ui-border)", overflowX: "auto", background: "var(--ui-surface)", flexShrink: 0 }}>
          {visibleSubs.map((s) => (
            <button key={s.key} type="button" style={tabBtn(s.key === activeSub, true)} onClick={() => go(s.key)}>{s.label}</button>
          ))}
        </nav>
      ) : null}
      <section style={{ flex: 1, minHeight: 0, padding: 20, overflowY: "auto" }}>
        {body[activeSub]}
      </section>
    </div>
  );
}
