// BF_PORTAL_LINK_CLICKS_PANEL_v9
// Which links people actually clicked. One component for both silos: BF mounts
// it against /api/marketing, BI against /api/v1/bi/marketing. The two servers
// return the same rollup shape; they differ only in how a clicker is
// identified (BF has a contact row, BI has an email address), so the drilldown
// tolerates both rather than assuming either.
import { useEffect, useState } from "react";
import { api } from "@/api";

type LinkRow = { url: string; clicks: number; contacts: number; last_clicked: string | null };
type ClickerRow = {
  id?: string; first_name?: string | null; last_name?: string | null;
  email?: string | null; clicks: number; last_clicked: string | null;
};

const DAY_CHOICES = [7, 30, 90, 365] as const;

function when(ts: string | null): string {
  if (!ts) return "-";
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString();
}

function clickerName(c: ClickerRow): string {
  const name = [c.first_name, c.last_name].filter(Boolean).join(" ").trim();
  return name || c.email || c.id || "Unknown";
}

export default function LinkClicksPanel({ apiBase = "/api/marketing" }: { apiBase?: string }) {
  const [rows, setRows] = useState<LinkRow[]>([]);
  const [days, setDays] = useState<number>(90);
  const [loading, setLoading] = useState(true);
  const [openUrl, setOpenUrl] = useState<string | null>(null);
  const [clickers, setClickers] = useState<ClickerRow[]>([]);
  const [clickersLoading, setClickersLoading] = useState(false);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setOpenUrl(null);
    api.get<{ data?: { items?: LinkRow[] }; items?: LinkRow[] }>(`${apiBase}/link-clicks?days=${days}`)
      .then((r) => { if (live) setRows(r?.data?.items ?? r?.items ?? []); })
      .catch(() => { if (live) setRows([]); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [apiBase, days]);

  const openLink = (url: string) => {
    if (openUrl === url) { setOpenUrl(null); return; }
    setOpenUrl(url);
    setClickers([]);
    setClickersLoading(true);
    api.get<{ data?: { items?: ClickerRow[] }; items?: ClickerRow[] }>(
      `${apiBase}/link-clicks/contacts?days=${days}&url=${encodeURIComponent(url)}`)
      .then((r) => setClickers(r?.data?.items ?? r?.items ?? []))
      .catch(() => setClickers([]))
      .finally(() => setClickersLoading(false));
  };

  return (
    <section className="rounded border p-4" style={{ borderColor: "var(--ui-border)", background: "var(--ui-surface)" }}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 style={{ color: "var(--ui-text)", fontWeight: 600, margin: 0 }}>Link clicks</h3>
        <label className="text-sm" style={{ color: "var(--ui-text-muted)" }}>
          Last
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            aria-label="Time window in days"
            className="ml-2 border rounded px-2 py-1 text-sm"
            style={{ borderColor: "var(--ui-border)", background: "var(--ui-surface-strong)", color: "var(--ui-text)" }}
          >
            {DAY_CHOICES.map((d) => <option key={d} value={d}>{d} days</option>)}
          </select>
        </label>
      </div>

      {loading ? (
        <p style={{ color: "var(--ui-text-muted)" }}>Loading...</p>
      ) : rows.length === 0 ? (
        <p style={{ color: "var(--ui-text-muted)" }}>
          No link clicks recorded in this window. Clicks are captured from the moment link tracking landed - earlier sends are not backfilled.
        </p>
      ) : (
        <table className="w-full mt-3 text-sm" style={{ color: "var(--ui-text)" }}>
          <thead>
            <tr style={{ color: "var(--ui-text-muted)", textAlign: "left" }}>
              <th style={{ fontWeight: 600, padding: "4px 6px" }}>Link</th>
              <th style={{ fontWeight: 600, padding: "4px 6px", width: 90 }}>Clicks</th>
              <th style={{ fontWeight: 600, padding: "4px 6px", width: 90 }}>People</th>
              <th style={{ fontWeight: 600, padding: "4px 6px", width: 120 }}>Last</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.url}>
                <td colSpan={4} style={{ padding: 0 }}>
                  <div className="border-t" style={{ borderColor: "var(--ui-border)" }}>
                    <button
                      type="button"
                      onClick={() => openLink(r.url)}
                      className="w-full text-left"
                      style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px 120px", gap: 0, padding: "6px", background: "transparent", color: "inherit" }}
                    >
                      <span style={{ overflowWrap: "anywhere" }}>{r.url}</span>
                      <span>{r.clicks}</span>
                      <span>{r.contacts}</span>
                      <span>{when(r.last_clicked)}</span>
                    </button>
                    {openUrl === r.url && (
                      <div style={{ padding: "0 6px 10px 18px" }}>
                        {clickersLoading ? (
                          <p style={{ color: "var(--ui-text-muted)", margin: 0 }}>Loading...</p>
                        ) : clickers.length === 0 ? (
                          <p style={{ color: "var(--ui-text-muted)", margin: 0 }}>Nobody resolved for this link.</p>
                        ) : (
                          <ul style={{ margin: 0, paddingLeft: 14 }}>
                            {clickers.map((c, i) => (
                              <li key={c.id ?? c.email ?? i} style={{ color: "var(--ui-text-muted)" }}>
                                {clickerName(c)} - {c.clicks} click{c.clicks === 1 ? "" : "s"}, last {when(c.last_clicked)}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
