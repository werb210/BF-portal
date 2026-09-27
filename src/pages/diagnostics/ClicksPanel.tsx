// BF_PORTAL_BLOCK_v615_AD_CLICKS
// Marketing > Ads > Clicks. Every Google Ads click that became a CRM contact, all time,
// grouped campaign > ad group > ad (with the keywords that brought each ad its clicks).
// Performance Max is left out by the server. Read-only.
import { Fragment, useEffect, useState, type CSSProperties } from "react";
import { apiClient } from "@/api/client";

export type AdNode = { adId: string; label: string; clicks: number; keywords: Array<{ keyword: string; clicks: number }> };
export type AdGroupNode = { adGroup: string; clicks: number; ads: AdNode[] };
export type CampaignNode = { campaign: string; clicks: number; adGroups: AdGroupNode[] };
export type ClickTree = { total: number; campaigns: CampaignNode[] };

export function unwrapClicks(res: unknown): ClickTree {
  const r = (res && typeof res === "object" && "data" in (res as any) ? (res as any).data : res) as Partial<ClickTree> | null;
  return { total: Number(r?.total ?? 0), campaigns: Array.isArray(r?.campaigns) ? (r!.campaigns as CampaignNode[]) : [] };
}

const cell: CSSProperties = { padding: "8px 10px", borderBottom: "1px solid var(--ui-border, #E5E7EB)" };
const num: CSSProperties = { ...cell, textAlign: "right", fontVariantNumeric: "tabular-nums", width: 110 };

export default function ClicksPanel() {
  const [tree, setTree] = useState<ClickTree | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient.get<unknown>("/api/marketing/ad-clicks")
      .then((res) => setTree(unwrapClicks(res)))
      .catch(() => setError("Could not load ad clicks."));
  }, []);

  if (error) return <div data-testid="ad-clicks-error" style={{ padding: 16, color: "#b91c1c" }}>{error}</div>;
  if (!tree) return <div style={{ padding: 16, color: "var(--ui-text-muted)" }}>Loading...</div>;
  if (!tree.campaigns.length) return <div style={{ padding: 16, color: "var(--ui-text-muted)" }}>No ad clicks recorded in the CRM yet.</div>;

  return (
    <div className="ui-card" style={{ padding: 16 }} data-testid="ad-clicks">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <div style={{ fontSize: 12, letterSpacing: 1, color: "var(--ui-text-muted)" }}>GOOGLE ADS CLICKS IN THE CRM - ALL TIME</div>
        <div style={{ fontWeight: 600 }}>{tree.total} clicks</div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--ui-text-muted)" }}>
              <th style={cell}>Campaign / ad group / ad</th>
              <th style={cell}>Keywords</th>
              <th style={{ ...num, fontWeight: 600 }}>Clicks</th>
            </tr>
          </thead>
          <tbody>
            {tree.campaigns.map((c) => (
              <Fragment key={c.campaign}>
                <tr data-testid="ad-clicks-campaign" style={{ background: "var(--ui-surface-muted, #F8FAFC)" }}>
                  <td style={{ ...cell, fontWeight: 700 }} colSpan={2}>{c.campaign}</td>
                  <td style={{ ...num, fontWeight: 700 }}>{c.clicks}</td>
                </tr>
                {c.adGroups.map((g) => (
                  <Fragment key={`${c.campaign}|${g.adGroup}`}>
                    <tr data-testid="ad-clicks-adgroup">
                      <td style={{ ...cell, paddingLeft: 28, fontWeight: 600 }} colSpan={2}>{g.adGroup}</td>
                      <td style={{ ...num, fontWeight: 600 }}>{g.clicks}</td>
                    </tr>
                    {g.ads.map((a) => (
                      <tr key={`${c.campaign}|${g.adGroup}|${a.adId}`} data-testid="ad-clicks-ad">
                        <td style={{ ...cell, paddingLeft: 52 }}>{a.label}</td>
                        <td style={{ ...cell, color: "var(--ui-text-muted)" }}>
                          {a.keywords.length ? a.keywords.map((k) => `${k.keyword} (${k.clicks})`).join(", ") : "-"}
                        </td>
                        <td style={num}>{a.clicks}</td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
