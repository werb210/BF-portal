// BF_PORTAL_ABANDONED_PANEL_v49
// The funnel tells you 40% never submit. It does not tell you WHO, or how to reach
// them. Each of these is a person who passed phone OTP and stopped - a verified
// number from a paid click that nobody has called. Sorted by most recent activity,
// with the step they reached and the ad that brought them.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/api";

type Item = {
  applicationId: string;
  step: number;
  contactId: string | null;
  name: string | null;
  phone: string | null;
  country: "CA" | "US" | null;
  countryInferred?: boolean; // BF_PORTAL_COUNTRY_INFERRED_v52 // BF_PORTAL_ABANDONED_COUNTRY_v51
  email: string | null;
  amount: string | number | null;
  product: string | null;
  source: string | null;
  campaign: string | null;
  startedAt: string;
  lastActivityAt: string;
  nudgedAt: string | null;
};

const STEP_LABEL: Record<number, string> = {
  1: "Financial profile",
  2: "Product",
  3: "Business",
  4: "Applicant",
  5: "Documents",
  6: "Review & submit",
};

function ago(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "-";
  const d = Math.floor(ms / 86_400_000);
  if (d >= 1) return `${d}d ago`;
  const h = Math.floor(ms / 3_600_000);
  if (h >= 1) return `${h}h ago`;
  return `${Math.max(1, Math.floor(ms / 60_000))}m ago`;
}

export default function AbandonedPanel() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [days, setDays] = useState(90);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get<{ data?: { items?: Item[] }; items?: Item[] }>(`/api/marketing/abandoned?days=${days}`)
      .then((r) => {
        if (cancelled) return;
        const payload = (r as any)?.data ?? r;
        setItems(Array.isArray(payload?.items) ? payload.items : []);
      })
      .catch(() => { if (!cancelled) setItems([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [days]);

  return (
    <div className="drawer-section">
      <div className="flex items-center justify-between mb-2">
        <div className="drawer-section__title">
          Started, not submitted{items ? ` (${items.length})` : ""}
        </div>
        <select
          className="ui-input"
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          style={{ width: 140 }}
        >
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={365}>Last 12 months</option>
        </select>
      </div>

      {loading ? (
        <p style={{ color: "var(--ui-text-muted)", fontSize: "0.85rem" }}>Loading&hellip;</p>
      ) : !items || items.length === 0 ? (
        <p style={{ color: "var(--ui-text-muted)", fontSize: "0.85rem" }}>
          Nobody has an unsubmitted application in this window.
        </p>
      ) : (
        <table className="text-sm" style={{ width: "100%", borderCollapse: "collapse", color: "var(--ui-text)" }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--ui-text-muted)" }}>
              <th style={{ padding: "6px 8px" }}>Reached</th>
              <th style={{ padding: "6px 8px" }}>Contact</th>
              <th style={{ padding: "6px 8px" }}>Phone</th>
              {/* BF_PORTAL_ABANDONED_COUNTRY_v51 - the country changes what you can
                  offer, so it belongs next to the number you would dial. */}
              <th style={{ padding: "6px 8px" }}>Country</th>
              <th style={{ padding: "6px 8px" }}>Amount</th>
              <th style={{ padding: "6px 8px" }}>Source</th>
              <th style={{ padding: "6px 8px" }}>Last seen</th>
              <th style={{ padding: "6px 8px" }}>Nudged</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.applicationId} style={{ borderTop: "1px solid var(--ui-border-soft)" }}>
                <td style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>
                  Step {i.step} &middot; {STEP_LABEL[i.step] ?? "-"}
                </td>
                <td style={{ padding: "6px 8px" }}>
                  {i.contactId ? (
                    <Link to={`/crm/contacts/${i.contactId}`}>{i.name || "Unknown"}</Link>
                  ) : (
                    i.name || "Unknown"
                  )}
                </td>
                <td style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>{i.phone || "-"}</td>
                {/* BF_PORTAL_ABANDONED_COUNTRY_v51 */}
                {/* BF_PORTAL_COUNTRY_INFERRED_v52 - a country derived from the area
                    code is marked, because a mobile follows the person and not the
                    business. Staff should know which ones the applicant told us. */}
                <td style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>
                  {i.country || "-"}
                  {i.country && i.countryInferred ? (
                    <span
                      title="Inferred from the phone's area code - they did not tell us"
                      style={{ color: "var(--ui-text-muted)", marginLeft: 4 }}
                    >?</span>
                  ) : null}
                </td>
                <td style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>{i.amount || "-"}</td>
                <td style={{ padding: "6px 8px" }}>{i.source || "direct"}</td>
                <td style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>{ago(i.lastActivityAt)}</td>
                <td style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>{i.nudgedAt ? "yes" : "no"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
