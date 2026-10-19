// BF_PORTAL_v828_APPLICATION_ORIGIN - "Where this came from" at the top of an application that a partner sent us. A
// partner's file is an ordinary application on the pipeline; this panel is the only difference.
//   lender   - the lender referral panel (who sent it, why they declined it, Accept / Decline until decided)
//   broker   - the broker, when they sent it, the zip, and the commission split
//   referrer - the referral partner who sent the client
// Nothing for website, Maya or staff-entered applications.
import { useCallback, useEffect, useState } from "react";
import { api } from "@/api";
import LenderReferralPanel from "@/pages/lenderReferrals/LenderReferralPanel";
import type { StaffReferral } from "@/pages/lenderReferrals/lenderReferralShared";
import { formatPhone } from "@/pages/lenderReferrals/lenderReferralShared";
import { originBox, originKicker } from "@/pages/lenderReferrals/originStyles";

type Split = { borealPct: number | null; partnerPct: number | null; terms: string | null; status: string | null; payoutAmount: number | null; payoutPaidOn: string | null };
export type ApplicationOrigin =
  | { kind: "lender"; partner: string; sentAt: string | null; referral: StaffReferral }
  | { kind: "broker"; partner: string; sentAt: string | null; zipName: string | null; uploadedBy: string | null; split: Split | null }
  | { kind: "referrer"; partner: string; company: string | null; email: string | null; phone: string | null; sentAt: string | null };

const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-CA") : null);

export function splitText(split: Split | null): string {
  if (!split || split.status === null) return "No split agreed yet - set it on the Lenders tab.";
  const pct = `Boreal ${split.borealPct ?? "-"}% / broker ${split.partnerPct ?? "-"}%${split.terms ? ` (${split.terms})` : ""}`;
  if (split.status === "accepted") return `Agreed: ${pct}`;
  if (split.status === "countered") return `The broker proposed a different split: ${pct}`;
  return `Proposed, waiting for the broker: ${pct}`;
}

export default function ApplicationOriginPanel({ applicationId }: { applicationId: string }) {
  const [origin, setOrigin] = useState<ApplicationOrigin | null>(null);
  const load = useCallback(async () => {
    try {
      const res = await api.get<{ origin?: ApplicationOrigin | null }>(`/api/application-origin/${encodeURIComponent(applicationId)}`);
      setOrigin(res?.origin ?? null);
    } catch {
      setOrigin(null);
    }
  }, [applicationId]);
  useEffect(() => { if (applicationId) void load(); }, [applicationId, load]);

  if (!origin) return null;
  if (origin.kind === "lender") return <LenderReferralPanel applicationId={applicationId} initial={origin.referral} />;

  const line = { fontSize: 13, marginTop: 4 } as const;
  return (
    <div style={originBox(false)} data-testid="application-origin">
      <div style={originKicker}>Where this came from</div>
      {origin.kind === "broker" ? (
        <>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Broker file from {origin.partner}</div>
          <div style={line}>
            {[origin.sentAt ? `Sent ${day(origin.sentAt)}` : null, origin.zipName ? `zip: ${origin.zipName}` : null].filter(Boolean).join(" · ")}
          </div>
          <div style={line}>{splitText(origin.split)}</div>
          {origin.split?.payoutAmount != null && (
            <div style={line}>Broker payout: ${Number(origin.split.payoutAmount).toLocaleString("en-CA")}{origin.split.payoutPaidOn ? ` paid ${origin.split.payoutPaidOn}` : " (not paid yet)"}</div>
          )}
        </>
      ) : (
        <>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Referred by {origin.partner}{origin.company && origin.company !== origin.partner ? ` (${origin.company})` : ""}</div>
          <div style={line}>
            {[origin.sentAt ? `Referred ${day(origin.sentAt)}` : null, origin.email, origin.phone ? formatPhone(origin.phone) : null].filter(Boolean).join(" · ")}
          </div>
          <div style={line}>The referral partner follows this file's stage in their portal and is paid a referral fee if it funds.</div>
        </>
      )}
    </div>
  );
}
