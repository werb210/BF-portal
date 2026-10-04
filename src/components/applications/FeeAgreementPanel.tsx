// BF_PORTAL_FEE_AGREEMENT_v709
// Media files sent to a lender without a signed broker agreement get a client
// fee agreement (2% on funding). Shows staff whether it is waiting or signed.
import { useEffect, useState } from "react";
import { api } from "@/api";

export type FeeAgreementStatus = {
  required: boolean;
  status?: string;
  signerName?: string | null;
  signerEmail?: string | null;
  signerIsApplicant?: boolean;
  lenderName?: string | null;
  createdAt?: string | null;
  sentAt?: string | null;
  signedAt?: string | null;
  texts?: Array<{ toLast4: string; status: string | null; errorCode: string | null; createdAt: string }>; // BF_PORTAL_FEE_DIAGNOSE_v743
  notices?: Array<{ channel: string; error: string | null; createdAt: string }>; // BF_PORTAL_FEE_NOTICE_DELIVERY_v740
};

// BF_PORTAL_FEE_NOTICE_DELIVERY_v740 - say what the server actually delivered, not a fixed "Sent".
export type FeeDelivery = { push: boolean; sms: boolean; email: boolean; phoneLast4: string | null; emailTo: string | null; errors: string[] };
export function describeDelivery(d: FeeDelivery | null | undefined): { ok: boolean; text: string } {
  if (!d) return { ok: true, text: "Sent." };
  const parts: string[] = [];
  if (d.sms) parts.push("texted to the mobile ending " + (d.phoneLast4 ?? "?"));
  if (d.email) parts.push("emailed to " + (d.emailTo ?? "the client"));
  if (d.push) parts.push("app notice sent");
  const sent = parts.length ? "Sent: " + parts.join(", ") + "." : "Nothing was sent.";
  const problems = d.errors && d.errors.length ? " Not delivered: " + d.errors.join("; ") + "." : "";
  return { ok: parts.length > 0, text: sent + problems };
}
const NOTICE_LABEL: Record<string, string> = { sms: "Text sent", email: "Email sent", push: "App notice sent" };
export function noticeLine(n: { channel: string; error: string | null; createdAt: string }): string {
  const when = new Date(n.createdAt).toLocaleString("en-CA", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  return when + " - " + (NOTICE_LABEL[n.channel] ?? ("Not sent" + (n.error ? ": " + n.error : "")));
}

const day = (v?: string | null): string => (v ? new Date(v).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" }) : "");

export function describeFeeAgreement(a: FeeAgreementStatus | null): { tone: "signed" | "waiting"; text: string } | null {
  if (!a || !a.required) return null;
  const who = a.signerName || "the client";
  if (a.status === "signed") {
    return { tone: "signed", text: "Fee agreement (2% on funding) signed by " + who + (a.signedAt ? " on " + day(a.signedAt) : "") + ". The signed copy is in Documents." };
  }
  const how = a.signerIsApplicant === false ? "emailed to " + who + (a.signerEmail ? " (" + a.signerEmail + ")" : "") : "sent to " + who + " to sign in the client portal";
  const when = a.sentAt ? " on " + day(a.sentAt) : a.createdAt ? " on " + day(a.createdAt) : "";
  // BF_PORTAL_FEE_AGREEMENT_PANEL_FIX_v738 - no more "<lender> has no broker agreement" line: on a
  // hand-sent agreement it just repeated whatever lender name was typed, and read as an error.
  return { tone: "waiting", text: "Fee agreement (2% on funding) " + how + when + ". Waiting for signature." };
}

// BF_PORTAL_FEE_AGREEMENT_SEND_NOW_v731 - staff can send the agreement themselves on any
// Media file (for files sent to a lender by hand, outside the portal), and send it again
// while it is waiting.
// A real-looking button: navy, white text, rounded - it was rendering as plain text.
const SEND_BTN = { background: "#0B1F3A", color: "#ffffff", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 14, fontWeight: 600, cursor: "pointer" } as const;
export const isMediaFile = (category?: string | null): boolean => /media|film/i.test(String(category ?? ""));

// BF_PORTAL_FEE_DIAGNOSE_v743 - what the carrier did with each text (Twilio accepting it is not delivery).
export function textLine(t: { toLast4: string; status: string | null; errorCode: string | null; createdAt: string }): { bad: boolean; text: string } {
  const when = new Date(t.createdAt).toLocaleString("en-CA", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const st = (t.status || "sent").toLowerCase();
  const bad = /undelivered|failed/.test(st);
  const label = st === "delivered" ? "delivered" : bad ? "NOT delivered" + (t.errorCode ? " (Twilio error " + t.errorCode + ")" : "") : st;
  return { bad, text: when + " - text to mobile ending " + (t.toLast4 || "?") + ": " + label };
}

export default function FeeAgreementPanel({ applicationId, productCategory }: { applicationId: string; productCategory?: string | null }) {
  const [data, setData] = useState<FeeAgreementStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [noteOk, setNoteOk] = useState(true);
  const [diag, setDiag] = useState<{ ok: boolean; problems: string[] } | null>(null); // BF_PORTAL_FEE_DIAGNOSE_v743
  const diagnose = async () => {
    try { const r = await api.get<{ ok: boolean; problems: string[] }>("/api/portal/applications/" + encodeURIComponent(applicationId) + "/fee-agreement/diagnose"); setDiag({ ok: Boolean(r?.ok), problems: Array.isArray(r?.problems) ? r.problems : [] }); }
    catch (e: any) { setDiag({ ok: false, problems: [String(e?.message ?? "Could not run the check.")] }); }
  };
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let alive = true;
    Promise.resolve()
      .then(() => api.get<FeeAgreementStatus>("/api/portal/applications/" + encodeURIComponent(applicationId) + "/fee-agreement"))
      .then((r) => { if (alive) setData(r ?? null); })
      .catch(() => { if (alive) setData(null); });
    return () => { alive = false; };
  }, [applicationId, reload]);
  const send = async () => {
    const lenderName = null; // BF_PORTAL_FEE_AGREEMENT_PANEL_FIX_v738 - no pop-up question; one click sends it
    setBusy(true); setNote(null);
    try {
      const r = await api.post<{ delivery?: FeeDelivery | null }>("/api/portal/applications/" + encodeURIComponent(applicationId) + "/fee-agreement/send", { lenderName: lenderName || undefined });
      const told = describeDelivery(r?.delivery);
      setNoteOk(told.ok); setNote(told.text);
      setReload((n) => n + 1);
    } catch (e: any) {
      setNoteOk(false); setNote(e?.response?.data?.message ?? e?.data?.message ?? e?.message ?? "Could not send the agreement.");
    } finally { setBusy(false); }
  };
  const d = describeFeeAgreement(data);
  const media = isMediaFile(productCategory);
  if (!d) {
    if (!media || data === null) return null;
    return (
      <div data-testid="fee-agreement-send" style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button type="button" disabled={busy} onClick={() => void send()} style={SEND_BTN}>{busy ? "Sending..." : "Send fee agreement to client"}</button>
        <span style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>Media file with no client fee agreement yet (2% on funding).</span>
        {note && <span role="status" style={{ fontSize: 12, color: noteOk ? "#065f46" : "#991b1b", fontWeight: 600 }}>{note}</span>}
      </div>
    );
  }
  const signed = d.tone === "signed";
  return (
    <div data-testid="fee-agreement-panel" role="status"
      style={{ marginTop: 8, padding: "8px 10px", borderRadius: 6, fontSize: 13, maxWidth: 560, background: signed ? "#ecfdf5" : "#eff6ff", color: signed ? "#065f46" : "#0B1F3A", border: signed ? "1px solid #a7f3d0" : "1px solid #bfdbfe" /* BF_PORTAL_WWW_AND_FEE_COLOUR_v744 - waiting is not a warning */ }}>
      {d.text}
      {!signed && <div style={{ marginTop: 6 }}><button type="button" disabled={busy} onClick={() => void send()} style={{ ...SEND_BTN, background: "#ffffff", color: "#0B1F3A", border: "1px solid #0B1F3A" }}>{busy ? "Sending..." : "Send again"}</button>{note && <span style={{ marginLeft: 8, color: noteOk ? "#065f46" : "#991b1b", fontWeight: 600 }}>{note}</span>}</div>}
      {data?.texts && data.texts.length > 0 && <div data-testid="fee-texts" style={{ marginTop: 8, fontSize: 12 }}><div style={{ fontWeight: 600, color: "#0B1F3A" }}>Texts to the client</div>{data.texts.map((t, i) => { const l = textLine(t); return <div key={i} style={{ color: l.bad ? "#991b1b" : "#0B1F3A", fontWeight: l.bad ? 600 : 400 }}>{l.text}</div>; })}</div>}
      {!signed && <div style={{ marginTop: 8 }}><button type="button" onClick={() => void diagnose()} style={{ ...SEND_BTN, background: "#ffffff", color: "#0B1F3A", border: "1px solid #0B1F3A", padding: "6px 12px", fontSize: 13 }}>Check delivery setup</button>{diag && <div data-testid="fee-diagnose" style={{ marginTop: 6, fontSize: 12, fontWeight: 600, color: diag.ok ? "#065f46" : "#991b1b" }}>{diag.ok ? "Everything needed to text, email and sign is set up." : diag.problems.map((p, i) => <div key={i}>{p}</div>)}</div>}</div>}
      {data?.notices && data.notices.length > 0 && <div data-testid="fee-notices" style={{ marginTop: 8, fontSize: 12, color: "#0B1F3A" }}><div style={{ fontWeight: 600 }}>Notices to the client</div>{data.notices.map((n, i) => <div key={i} style={{ color: n.channel === "none" ? "#991b1b" : "#0B1F3A" }}>{noticeLine(n)}</div>)}</div>}
    </div>
  );
}
