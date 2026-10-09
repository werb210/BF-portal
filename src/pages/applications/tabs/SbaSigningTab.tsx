// BF_PORTAL_SBA_SIGNING_TAB_v146
// Staff can inspect SBA signing progress and refresh expired SignNow links.
import { useCallback, useEffect, useState } from "react";
import { api } from "@/api";
import { getErrorMessage } from "@/utils/errors";

type Envelope = {
  ownerIndex?: number;
  email?: string;
  groupId?: string;
  inviteId?: string;
  docIds?: string[];
  docNames?: string[];
  ives4506cLenderIds?: string[];
};

type Status = {
  isSba: boolean;
  formsComplete?: boolean;
  missingForms?: string[];
  envelopes?: Envelope[];
  allSigned?: boolean;
  // BF_PORTAL_SBA_PACKAGE_READINESS_v770 - from BF-Server v788.
  selectedLenders?: Array<{ lenderId: string; name: string; ives: boolean; offersSba: boolean | null }>;
  ivesFallback?: boolean;
  packageBlock?: { reason: string; detail?: string } | null;
};

// BF_PORTAL_SBA_PACKAGE_READINESS_v770
const PACKAGE_BLOCK_TEXT: Record<string, string> = {
  sba_signing_not_started: "Waiting for Send on the Lenders tab.",
  preconditions_not_met: "Held: documents or client tasks are still outstanding.",
  sba_4506c_missing_for_lender: "Held: a saved lender has no signed 4506-C. Press Send for signing on the Application tab so every owner signs one for it.",
  sba_4506c_missing: "Held: no 4506-C was signed. Add the IVES details to the lender, then press Send for signing on the Application tab.",
  sba_forms_not_signed: "Held: waiting for every owner to sign.",
  sba_check_failed: "The SBA checks could not run. Refresh in a minute.",
};

const s = {
  wrap: { padding: 4 },
  h: { fontSize: 15, fontWeight: 700, color: "var(--ui-text)", margin: "4px 0 10px" },
  card: { border: "1px solid var(--ui-border)", borderRadius: 8, padding: 14, marginBottom: 12, background: "var(--ui-surface-strong)" },
  row: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--ui-border-soft)", gap: 12 },
  label: { fontSize: 12, color: "var(--ui-text-muted)" },
  val: { fontSize: 13, color: "var(--ui-text)", fontWeight: 600 },
  pill: (ok: boolean) => ({ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: ok ? "#0f766e18" : "#b45c0918", color: ok ? "#0f766e" : "#b45c09", border: `1px solid ${ok ? "#0f766e44" : "#b45c0944"}` }),
  btn: { border: 0, background: "var(--ui-accent, #B08D3F)", color: "#fff", padding: "8px 16px", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  btnOff: { border: 0, background: "var(--ui-surface-muted)", color: "#fff", padding: "8px 16px", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "not-allowed", fontFamily: "inherit" },
  note: { fontSize: 12, color: "var(--ui-text-muted)", lineHeight: 1.5, marginTop: 8 },
  err: { fontSize: 12, color: "#b91c1c", background: "#b91c1c12", border: "1px solid #b91c1c33", borderRadius: 6, padding: "8px 10px", marginBottom: 10 },
  ok: { fontSize: 12, color: "#0f766e", background: "#0f766e12", border: "1px solid #0f766e33", borderRadius: 6, padding: "8px 10px", marginBottom: 10 },
  mono: { fontFamily: "ui-monospace, Menlo, monospace", fontSize: 11, color: "var(--ui-text-muted)", wordBreak: "break-all" as const },
};

export default function SbaSigningTab({ applicationId }: { applicationId: string }) {
  const [data, setData] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api.get<any>(`/api/applications/${encodeURIComponent(applicationId)}/sba-signing`);
      setData(((r as any)?.data ?? r) as Status);
      setError(null);
    } catch (e) {
      setError(getErrorMessage(e, "Could not load SBA signing status."));
    }
  }, [applicationId]);

  useEffect(() => { void load(); }, [load]);

  if (error && !data) return <div style={s.wrap}><div style={s.err}>{error}</div></div>;
  if (!data) return <div style={s.wrap}><div style={s.label}>Loading…</div></div>;

  if (!data.isSba) return <div style={s.wrap}><div style={s.card}><div style={s.h}>Not an SBA application</div><div style={s.note}>SBA forms are only generated for SBA products. If this should be an SBA file, check the selected lender product - the purpose of funds alone will only be used until a product is matched.</div></div></div>;

  const envelopes = data.envelopes ?? [];
  const missing = data.missingForms ?? [];
  const lenders = data.selectedLenders ?? [];

  return <div style={s.wrap}>
    {error && <div style={s.err}>{error}</div>}
    <div style={s.card}>
      <div style={s.h}>SBA signing</div>
      <div style={s.row}><span style={s.label}>Applicant forms complete</span><span style={s.pill(!!data.formsComplete)} data-testid="sba-forms-complete">{data.formsComplete ? "Complete" : "Outstanding"}</span></div>
      <div style={s.row}><span style={s.label}>All owners signed</span><span style={s.pill(!!data.allSigned)} data-testid="sba-all-signed">{data.allSigned ? "Signed" : "Not yet"}</span></div>
      {missing.length > 0 && <div style={s.note} data-testid="sba-missing-forms">Waiting on: {missing.join(", ")}. The applicant fills these in their portal under SBA Forms; signing cannot start until they are submitted.</div>}
    </div>
    {/* BF_PORTAL_SBA_PACKAGE_READINESS_v770 - only once BF-Server v788 is live (it sends selectedLenders). */}
    {data.selectedLenders !== undefined && <div style={s.card} data-testid="sba-lenders-card">
      <div style={s.h}>Lenders and IRS 4506-C</div>
      {lenders.length === 0 ? <div style={s.note} data-testid="sba-no-lenders">No lender saved on this file yet. The 4506-C names the lender that may pull the tax transcripts, so the lender comes first: Lenders tab, tick it and press Send. That starts the signing; nothing goes to the lender until every owner has signed.{data.ivesFallback ? " Without a saved lender the 4506-C names the default IVES participant." : " Without a saved lender no 4506-C is created and the package will be held."}</div>
        : lenders.map((l) => <div key={l.lenderId} style={s.row}><span style={s.val}>{l.name || l.lenderId}</span><span style={s.pill(l.ives)} data-testid={`sba-lender-ives-${l.lenderId}`}>{l.ives ? "4506-C included" : (data.ivesFallback ? "Default IVES participant" : "No IVES details - no 4506-C")}</span></div>)}
      {data.packageBlock && <div style={s.note} data-testid="sba-package-block">{PACKAGE_BLOCK_TEXT[data.packageBlock.reason] ?? `Held: ${data.packageBlock.reason}`}{data.packageBlock.detail ? ` (${data.packageBlock.detail})` : ""}</div>}
      {!data.packageBlock && envelopes.length > 0 && data.allSigned && <div style={s.note} data-testid="sba-package-ready">Signed and complete - the package can go to the saved lenders.</div>}
        </div>}
    <div style={s.card}>
      <div style={s.h}>Envelopes ({envelopes.length})</div>
      {envelopes.length === 0 ? <div style={s.note}>No envelopes yet. Signing starts when you press Send on the Lenders tab.</div> : envelopes.map((e, i) => <div key={i} style={{ padding: "10px 0", borderBottom: "1px solid var(--ui-border-soft)" }}>
        <div style={s.row}><span style={s.val}>Owner {e.ownerIndex ?? i + 1}</span><span style={s.label}>{e.email || "no email on file"}</span></div>
        <div style={s.note}>{(e.docNames?.length ?? e.docIds?.length ?? 0)} document{(e.docNames?.length ?? e.docIds?.length ?? 0) === 1 ? "" : "s"}{e.docNames?.length ? `: ${e.docNames.join(", ")}` : ""}</div>
        {(e.ives4506cLenderIds?.length ?? 0) === 0 && <div style={s.note} data-testid={`sba-no-4506c-${e.ownerIndex ?? i + 1}`}>No 4506-C. Set the IVES participant fields on the selected lender, then press Send for signing on the Application tab - the package cannot be dispatched without one.</div>}
        {e.groupId && <div style={s.mono}>group {e.groupId}</div>}
      </div>)}
    </div>
    {/* BF_PORTAL_SBA_ONE_BUTTON_v771 - one way to sign: this tab shows status only. */}
    <div style={s.card} data-testid="sba-how-to-sign">
      <div style={s.h}>How signing starts</div>
      <div style={s.note}>Same as every other file: on the Lenders tab tick the lender and press Send. Every owner then signs once: the Boreal application and their SBA forms together (1919 for owner 1, 912, a 4506-C for each saved lender with IVES details, and 413). Owner 1 is texted and signs in the client portal; other owners get an email from SignNow. Once everyone has signed the package goes to the lender on its own. After the applicant edits anything, press Send for signing on the Application tab to have them sign again.</div>
    </div>
  </div>;
}
