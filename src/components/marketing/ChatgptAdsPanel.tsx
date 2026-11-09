// BF_PORTAL_v913_CHATGPT_ADS - Marketing > Ads > ChatGPT: campaigns from the OpenAI Ads (ChatGPT Ads) account with
// spend, clicks, CTR, CPC and conversions for a date range, and pause / resume. Reads GET /api/chatgpt-ads/campaigns.
import { useCallback, useEffect, useState } from "react";
import { api } from "@/api";

export type ChatgptCampaign = {
  id: string; name: string; status: string; bidding_type: string | null; lifetime_budget: number | null;
  impressions: number; clicks: number; spend: number; ctr: number | null; cpc: number | null; conversions: number;
};
type Resp = { configured?: boolean; range?: { since: string; until: string }; campaigns?: ChatgptCampaign[]; total?: { impressions: number; clicks: number; spend: number; conversions: number }; message?: string };

const money = (n: number | null | undefined) => (n == null ? "-" : n.toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 2 }));
const int = (n: number) => n.toLocaleString("en-CA");
const pct = (n: number | null) => (n == null ? "-" : `${(n <= 1 ? n * 100 : n).toFixed(2)}%`);
export const costPer = (spend: number, conversions: number) => (conversions > 0 ? spend / conversions : null);

const iso = (d: Date) => d.toISOString().slice(0, 10);
export function presetRange(days: number, now = new Date()): { since: string; until: string } {
  return { since: iso(new Date(now.getTime() - (days - 1) * 86400000)), until: iso(now) };
}

function unwrap(r: any): Resp { return (r?.data && typeof r.data === "object" && !Array.isArray(r.data) ? r.data : r) as Resp; }

export default function ChatgptAdsPanel() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Resp | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const { since, until } = presetRange(days);
    try { setData(unwrap(await api.get<any>(`/api/chatgpt-ads/campaigns?since=${since}&until=${until}`))); }
    catch (e) { setError(String((e as { message?: string })?.message ?? "Couldn't load ChatGPT Ads.")); }
    finally { setLoading(false); }
  }, [days]);
  useEffect(() => { void load(); }, [load]);

  const toggle = async (c: ChatgptCampaign) => {
    const action = c.status === "active" ? "pause" : "activate";
    setBusyId(c.id); setError(null);
    try {
      await api.post<any>(`/api/chatgpt-ads/campaigns/${encodeURIComponent(c.id)}/${action}`, {});
      await load();
    } catch (e) { setError(String((e as { message?: string })?.message ?? `Couldn't ${action} the campaign.`)); }
    finally { setBusyId(null); }
  };

  const th: React.CSSProperties = { textAlign: "left", padding: "6px 8px", color: "var(--ui-text-muted)", fontWeight: 600, fontSize: "0.8rem" };
  const td: React.CSSProperties = { padding: "6px 8px", color: "var(--ui-text)", fontSize: "0.85rem", borderTop: "1px solid var(--ui-border)" };
  const tot = data?.total;

  return (
    <section className="drawer-section" data-testid="chatgpt-ads-panel">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <div className="drawer-section__title">ChatGPT Ads</div>
        <div style={{ display: "flex", gap: 6 }}>
          {[7, 30, 90].map((d) => (
            <button key={d} type="button" className={`ui-button ${days === d ? "ui-button--primary" : "ui-button--secondary"}`} onClick={() => setDays(d)}>{d} days</button>
          ))}
        </div>
      </div>
      {loading && <p style={{ color: "var(--ui-text-muted)" }}>Loading ChatGPT Ads...</p>}
      {error && <p role="alert" style={{ color: "#dc2626" }}>{error}</p>}
      {!loading && data && data.configured === false && (
        <p style={{ color: "var(--ui-text-muted)" }}>
          Not connected yet. Create an account at <a href="https://ads.openai.com" target="_blank" rel="noreferrer">ads.openai.com</a>, make an API key in its Settings, then an Admin pastes it in Settings &gt; Your services under ChatGPT Ads.
        </p>
      )}
      {!loading && data?.configured && (
        <>
          {tot && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, margin: "8px 0" }}>
              {[["Spend", money(tot.spend)], ["Clicks", int(tot.clicks)], ["Impressions", int(tot.impressions)], ["Conversions", int(tot.conversions)], ["Cost per conversion", money(costPer(tot.spend, tot.conversions))]].map(([k, v]) => (
                <div key={k} style={{ border: "1px solid var(--ui-border)", borderRadius: 8, padding: 10 }}>
                  <div style={{ color: "var(--ui-text-muted)", fontSize: "0.75rem" }}>{k}</div>
                  <div style={{ color: "var(--ui-text)", fontSize: "1.1rem", fontWeight: 600 }}>{v}</div>
                </div>
              ))}
            </div>
          )}
          {(data.campaigns ?? []).length === 0 ? <p style={{ color: "var(--ui-text-muted)" }}>No campaigns in this account yet.</p> : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>{["Campaign", "Status", "Spend", "Clicks", "CTR", "CPC", "Conversions", "Cost / conv.", ""].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {(data.campaigns ?? []).map((c) => (
                    <tr key={c.id}>
                      <td style={td}>{c.name}</td>
                      <td style={td}>{c.status === "active" ? "Active" : c.status === "paused" ? "Paused" : c.status}</td>
                      <td style={td}>{money(c.spend)}</td>
                      <td style={td}>{int(c.clicks)}</td>
                      <td style={td}>{pct(c.ctr)}</td>
                      <td style={td}>{money(c.cpc)}</td>
                      <td style={td}>{int(c.conversions)}</td>
                      <td style={td}>{money(costPer(c.spend, c.conversions))}</td>
                      <td style={td}>
                        {(c.status === "active" || c.status === "paused") && (
                          <button type="button" className="ui-button ui-button--secondary" disabled={busyId === c.id} onClick={() => toggle(c)}>
                            {busyId === c.id ? "..." : c.status === "active" ? "Pause" : "Resume"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p style={{ color: "var(--ui-text-muted)", fontSize: "0.75rem", marginTop: 6 }}>Spend is in the ad account's currency. Conversions count once ChatGPT conversion tracking is on for the account.</p>
        </>
      )}
    </section>
  );
}
