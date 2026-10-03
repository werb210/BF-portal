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
};

const day = (v?: string | null): string => (v ? new Date(v).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" }) : "");

export function describeFeeAgreement(a: FeeAgreementStatus | null): { tone: "signed" | "waiting"; text: string } | null {
  if (!a || !a.required) return null;
  const who = a.signerName || "the client";
  if (a.status === "signed") {
    return { tone: "signed", text: "Fee agreement (2% on funding) signed by " + who + (a.signedAt ? " on " + day(a.signedAt) : "") + ". The signed copy is in Documents." };
  }
  const how = a.signerIsApplicant === false ? "emailed to " + who + (a.signerEmail ? " (" + a.signerEmail + ")" : "") : "sent to " + who + " to sign in the client portal";
  const when = a.sentAt ? " on " + day(a.sentAt) : a.createdAt ? " on " + day(a.createdAt) : "";
  const why = a.lenderName ? " " + a.lenderName + " has no broker agreement with Boreal." : "";
  return { tone: "waiting", text: "Fee agreement (2% on funding) " + how + when + ". Waiting for signature." + why };
}

// BF_PORTAL_FEE_AGREEMENT_SEND_NOW_v731 - staff can send the agreement themselves on any
// Media file (for files sent to a lender by hand, outside the portal), and send it again
// while it is waiting.
export const isMediaFile = (category?: string | null): boolean => /media|film/i.test(String(category ?? ""));

export default function FeeAgreementPanel({ applicationId, productCategory }: { applicationId: string; productCategory?: string | null }) {
  const [data, setData] = useState<FeeAgreementStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
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
    const lenderName = window.prompt("Which lender is this file with? (shown to staff on the agreement record)", "") ?? null;
    setBusy(true); setNote(null);
    try {
      await api.post("/api/portal/applications/" + encodeURIComponent(applicationId) + "/fee-agreement/send", { lenderName: lenderName || undefined });
      setNote("Sent. The client gets a text (or email) to sign in the client portal.");
      setReload((n) => n + 1);
    } catch (e: any) {
      setNote(e?.response?.data?.message ?? e?.message ?? "Could not send the agreement.");
    } finally { setBusy(false); }
  };
  const d = describeFeeAgreement(data);
  const media = isMediaFile(productCategory);
  if (!d) {
    if (!media || data === null) return null;
    return (
      <div data-testid="fee-agreement-send" style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button type="button" className="ui-button ui-button--secondary" disabled={busy} onClick={() => void send()}>{busy ? "Sending..." : "Send fee agreement to client"}</button>
        <span style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>Media file with no client fee agreement yet (2% on funding).</span>
        {note && <span role="status" style={{ fontSize: 12 }}>{note}</span>}
      </div>
    );
  }
  const signed = d.tone === "signed";
  return (
    <div data-testid="fee-agreement-panel" role="status"
      style={{ marginTop: 8, padding: "8px 10px", borderRadius: 6, fontSize: 13, maxWidth: 560, background: signed ? "#ecfdf5" : "#fef3c7", color: signed ? "#065f46" : "#92400e" }}>
      {d.text}
      {!signed && <div style={{ marginTop: 6 }}><button type="button" className="ui-button ui-button--secondary" disabled={busy} onClick={() => void send()}>{busy ? "Sending..." : "Send again"}</button>{note && <span style={{ marginLeft: 8 }}>{note}</span>}</div>}
    </div>
  );
}
