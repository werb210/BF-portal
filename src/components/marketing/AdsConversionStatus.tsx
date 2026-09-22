// BF_PORTAL_ADS_CONVERSION_STATUS_v401 - one place to see that Google Ads is being
// told about applications: for each conversion, whether it is set up, how many were
// sent, and how many are waiting (BF-Server v400 /google-ads/conversions/status).
import { useEffect, useState } from "react";
import { api } from "@/api";

type Row = { configured: boolean; sent: number; waiting: number };
type Status = Record<"submitted" | "qualified" | "funded" | "retracted", Row>;

const LABELS: Array<[keyof Status, string, string]> = [
  ["submitted", "Application submitted", "GOOGLE_ADS_SUBMIT_CONVERSION_ACTION_ID"],
  ["qualified", "Qualified lead (Off to Lender or later)", "GOOGLE_ADS_QUALIFIED_CONVERSION_ACTION_ID"],
  ["funded", "Funded deal (with amount)", "GOOGLE_ADS_CONVERSION_ACTION_ID"],
  ["retracted", "Rejected leads withdrawn from Google", "GOOGLE_ADS_SUBMIT_CONVERSION_ACTION_ID"],
];

export default function AdsConversionStatus() {
  const [status, setStatus] = useState<Status | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    api.get<{ data?: Status } & Partial<Status>>("/api/marketing/google-ads/conversions/status")
      .then((res) => setStatus(((res as { data?: Status })?.data ?? res) as Status))
      .catch(() => setFailed(true));
  }, []);
  return (
    <section className="drawer-section" data-testid="ads-conversion-status">
      <div className="drawer-section__title mb-2">Google Ads conversions</div>
      <p style={{ color: "var(--ui-text-muted)", fontSize: 13, marginBottom: 8 }}>Sent to Google automatically every hour.</p>
      {failed && <p style={{ color: "var(--ui-text-muted)" }}>Couldn't load conversion status.</p>}
      {status && (
        <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ color: "var(--ui-text-muted)", textAlign: "left" }}>
              <th style={{ padding: "4px 0" }}>Conversion</th><th>Sent</th><th>Waiting</th><th>Set up</th>
            </tr>
          </thead>
          <tbody>
            {LABELS.map(([key, label, setting]) => {
              const r = status[key];
              if (!r) return null;
              return (
                <tr key={key} style={{ borderTop: "1px solid var(--ui-border)" }}>
                  <td style={{ padding: "6px 0" }}>{label}</td>
                  <td>{r.sent}</td>
                  <td>{key === "retracted" ? "-" : r.waiting}</td>
                  <td title={r.configured ? "" : `Add ${setting} in Azure`}>{r.configured ? "Yes" : `No - add ${setting}`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
