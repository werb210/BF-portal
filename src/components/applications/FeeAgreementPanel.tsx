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

export default function FeeAgreementPanel({ applicationId }: { applicationId: string }) {
  const [data, setData] = useState<FeeAgreementStatus | null>(null);
  useEffect(() => {
    let alive = true;
    Promise.resolve()
      .then(() => api.get<FeeAgreementStatus>("/api/portal/applications/" + encodeURIComponent(applicationId) + "/fee-agreement"))
      .then((r) => { if (alive) setData(r ?? null); })
      .catch(() => { if (alive) setData(null); });
    return () => { alive = false; };
  }, [applicationId]);
  const d = describeFeeAgreement(data);
  if (!d) return null;
  const signed = d.tone === "signed";
  return (
    <div data-testid="fee-agreement-panel" role="status"
      style={{ marginTop: 8, padding: "8px 10px", borderRadius: 6, fontSize: 13, maxWidth: 560, background: signed ? "#ecfdf5" : "#fef3c7", color: signed ? "#065f46" : "#92400e" }}>
      {d.text}
    </div>
  );
}
