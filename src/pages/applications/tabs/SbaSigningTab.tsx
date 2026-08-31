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
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  const resend = async () => {
    setBusy(true); setNotice(null); setError(null);
    try {
      const r = await api.post<any>(`/api/applications/${encodeURIComponent(applicationId)}/sba-signing/resend`, {});
      const links = ((r as any)?.data ?? r)?.links ?? [];
      const withUrl = links.filter((l: any) => l?.url).length;
      setNotice(`New signing links issued for ${withUrl} of ${links.length} owner${links.length === 1 ? "" : "s"}. They expire in 45 minutes.`);
      await load();
    } catch (e) {
      setError(getErrorMessage(e, "Could not resend. If the forms are not complete yet the applicant has to finish them first."));
    } finally {
      setBusy(false);
    }
  };

  if (error && !data) return <div style={s.wrap}><div style={s.err}>{error}</div></div>;
  if (!data) return <div style={s.wrap}><div style={s.label}>Loading…</div></div>;

  if (!data.isSba) return <div style={s.wrap}><div style={s.card}><div style={s.h}>Not an SBA application</div><div style={s.note}>SBA forms are only generated for SBA products. If this should be an SBA file, check the selected lender product - the purpose of funds alone will only be used until a product is matched.</div></div></div>;

  const envelopes = data.envelopes ?? [];
  const missing = data.missingForms ?? [];

  return <div style={s.wrap}>
    {error && <div style={s.err}>{error}</div>}
    {notice && <div style={s.ok} data-testid="sba-resend-notice">{notice}</div>}
    <div style={s.card}>
      <div style={s.h}>SBA signing</div>
      <div style={s.row}><span style={s.label}>Applicant forms complete</span><span style={s.pill(!!data.formsComplete)} data-testid="sba-forms-complete">{data.formsComplete ? "Complete" : "Outstanding"}</span></div>
      <div style={s.row}><span style={s.label}>All owners signed</span><span style={s.pill(!!data.allSigned)} data-testid="sba-all-signed">{data.allSigned ? "Signed" : "Not yet"}</span></div>
      {missing.length > 0 && <div style={s.note} data-testid="sba-missing-forms">Waiting on: {missing.join(", ")}. The applicant fills these in their portal under SBA Forms; signing cannot start until they are submitted.</div>}
    </div>
    <div style={s.card}>
      <div style={s.h}>Envelopes ({envelopes.length})</div>
      {envelopes.length === 0 ? <div style={s.note}>No envelopes yet. They are created automatically when the last SBA form is submitted, or by Resend below once the forms are complete.</div> : envelopes.map((e, i) => <div key={i} style={{ padding: "10px 0", borderBottom: "1px solid var(--ui-border-soft)" }}>
        <div style={s.row}><span style={s.val}>Owner {e.ownerIndex ?? i + 1}</span><span style={s.label}>{e.email || "no email on file"}</span></div>
        <div style={s.note}>{(e.docNames?.length ?? e.docIds?.length ?? 0)} document{(e.docNames?.length ?? e.docIds?.length ?? 0) === 1 ? "" : "s"}{e.docNames?.length ? `: ${e.docNames.join(", ")}` : ""}</div>
        {(e.ives4506cLenderIds?.length ?? 0) === 0 && <div style={s.note} data-testid={`sba-no-4506c-${e.ownerIndex ?? i + 1}`}>No 4506-C. Set the IVES participant fields on the selected lender, then resend - the package cannot be dispatched without one.</div>}
        {e.groupId && <div style={s.mono}>group {e.groupId}</div>}
      </div>)}
    </div>
    <div style={s.card}>
      <div style={s.h}>Resend signing links</div>
      <div style={s.note}>SignNow embedded links expire 45 minutes after they are issued. Resending rebuilds every owner's envelope from the current form data and issues fresh links, so use it after the applicant edits anything too.</div>
      <div style={{ marginTop: 12 }}><button type="button" data-testid="sba-resend" disabled={busy || !data.formsComplete} onClick={() => void resend()} style={busy || !data.formsComplete ? s.btnOff : s.btn}>{busy ? "Sending…" : "Resend signing links"}</button>
      {!data.formsComplete && <span style={{ ...s.label, marginLeft: 10 }}>Available once the applicant has submitted every SBA form.</span>}</div>
    </div>
  </div>;
}
