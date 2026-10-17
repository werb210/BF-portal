// BF_PORTAL_v811_MOBILE_APPS - Marketing > Mobile apps (BF silo): who uses the Boreal Financial client app on iPhone,
// iPad, Android and the web, and what they do in it (BF-Server v811 GET /api/reports/mobile-apps). Store downloads
// show as "not connected" until App Store Connect and Google Play reporting are linked.
import { useEffect, useMemo, useState } from "react";
import { api } from "@/api";

type Counts = { count: number; users: number };
export type MobileAppsReport = {
  days: number;
  devices: string[];
  active: Record<string, { d1: number; d7: number; period: number }>;
  events: Record<string, Record<string, Counts>>;
  daily: Array<{ day: string; device: string; users: number }>;
  signInMethods: Array<{ method: string; device: string; count: number }>;
  versions: Array<{ device: string; version: string; users: number; lastSeen: string }>;
  notificationsOn: Array<{ platform: string; users: number }>;
  quickSignIn: { biometric: number; passkey: number };
  stores: Record<"apple" | "google", { connected: boolean; note: string }>;
};

export const DEVICE_LABEL: Record<string, string> = { iphone: "iPhone", ipad: "iPad", android: "Android phone", android_tablet: "Android tablet", web: "Web browser" };
const EVENT_LABEL: Array<[string, string]> = [
  ["open", "Opens"], ["sign_in", "Sign-ins"], ["application_started", "Applications started"],
  ["application_submitted", "Applications submitted"], ["document_uploaded", "Documents uploaded"], ["form_submitted", "Forms completed"],
];
const METHOD_LABEL: Record<string, string> = { code: "Text code", biometric: "Face ID / fingerprint", passkey: "Passkey" };
const PERIODS = [7, 30, 90, 365];

const card = { border: "1px solid var(--ui-border)", borderRadius: 12, padding: 14, background: "var(--ui-surface-strong)", color: "var(--ui-text)" } as const;
const th = { textAlign: "left", padding: "6px 8px", fontSize: 12, color: "var(--ui-text-muted)", fontWeight: 600, borderBottom: "1px solid var(--ui-border)" } as const;
const td = { padding: "6px 8px", fontSize: 13, borderBottom: "1px solid var(--ui-border)" } as const;
const num = { ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" } as const;

function Tile({ label, value, sub, testId }: { label: string; value: string | number; sub?: string; testId?: string }) {
  return (
    <div style={{ ...card, minWidth: 150, flex: "1 1 150px" }} data-testid={testId}>
      <div style={{ fontSize: 12, color: "var(--ui-text-muted)", fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "var(--ui-text-muted)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// Daily active users (all devices together), one bar per day; hover a bar for the date and number.
export function DailyBars({ daily, days }: { daily: MobileAppsReport["daily"]; days: number }) {
  const series = useMemo(() => {
    const totals = new Map<string, number>();
    for (const d of daily) totals.set(d.day, (totals.get(d.day) ?? 0) + d.users);
    const out: Array<{ day: string; users: number }> = [];
    const end = new Date();
    for (let i = Math.min(days, 90) - 1; i >= 0; i--) {
      const dt = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate() - i));
      const key = dt.toISOString().slice(0, 10);
      out.push({ day: key, users: totals.get(key) ?? 0 });
    }
    return out;
  }, [daily, days]);
  const max = Math.max(1, ...series.map((s) => s.users));
  const W = 720, H = 160, gap = 2, bw = Math.max(2, (W - gap * (series.length - 1)) / series.length);
  return (
    <figure style={{ margin: 0 }}>
      <figcaption style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Daily active users{days > 90 ? " (last 90 days)" : ""}</figcaption>
      <svg viewBox={`0 0 ${W} ${H + 18}`} role="img" aria-label="Daily active users" style={{ width: "100%", height: "auto", display: "block" }} data-testid="apps-daily-chart">
        <line x1={0} x2={W} y1={H} y2={H} stroke="var(--ui-border)" strokeWidth={1} />
        {series.map((s, i) => {
          const h = s.users === 0 ? 0 : Math.max(3, (s.users / max) * (H - 8));
          const x = i * (bw + gap);
          return (
            <g key={s.day}>
              <rect x={x} y={0} width={bw} height={H} fill="transparent"><title>{s.day}: {s.users} active</title></rect>
              {h > 0 && <rect x={x} y={H - h} width={bw} height={h} rx={Math.min(4, bw / 2)} fill="var(--ui-accent-blue, #2563eb)"><title>{s.day}: {s.users} active</title></rect>}
            </g>
          );
        })}
        <text x={0} y={H + 14} fontSize={11} fill="var(--ui-text-muted)">{series[0]?.day}</text>
        <text x={W} y={H + 14} fontSize={11} fill="var(--ui-text-muted)" textAnchor="end">{series[series.length - 1]?.day}</text>
        <text x={W} y={10} fontSize={11} fill="var(--ui-text-muted)" textAnchor="end">max {max}</text>
      </svg>
    </figure>
  );
}

// BF_PORTAL_v819_MOBILE_REPORT - the report fetch, the five stat tiles and the by-device table are shared by this tab
// and the compact Dashboard / Reports card (MobileAppsSummary), so both read the same numbers the same way.
export function useMobileAppsReport(days: number) {
  const [data, setData] = useState<MobileAppsReport | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    setData(null); setErr(null);
    Promise.resolve(api.get<MobileAppsReport>("/api/reports/mobile-apps?days=" + days))
      .then((r) => { if (live) setData(r); })
      .catch(() => { if (live) setErr("Could not load the mobile app report."); });
    return () => { live = false; };
  }, [days]);
  return { data, err };
}

const appOnly = (d: string) => d !== "web";
const evCount = (data: MobileAppsReport, d: string, e: string) => data.events?.[d]?.[e]?.count ?? 0;

export function MobileAppsTiles({ data }: { data: MobileAppsReport }) {
  const devices = data.devices ?? [];
  const sumActive = (k: "d1" | "d7" | "period", only?: (d: string) => boolean) =>
    devices.filter((d) => !only || only(d)).reduce((n, d) => n + (data.active?.[d]?.[k] ?? 0), 0);
  const pushUsers = (data.notificationsOn ?? []).reduce((n, r) => n + r.users, 0);
  const quick = data.quickSignIn ?? { biometric: 0, passkey: 0 };
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      <Tile testId="apps-active-today" label="Active today (app)" value={sumActive("d1", appOnly)} sub={sumActive("d1", (d) => d === "web") + " on the web"} />
      <Tile testId="apps-active-7" label="Active last 7 days (app)" value={sumActive("d7", appOnly)} sub={sumActive("d7", (d) => d === "web") + " on the web"} />
      <Tile testId="apps-active-period" label={`Active last ${data.days} days (app)`} value={sumActive("period", appOnly)} sub={sumActive("period", (d) => d === "web") + " on the web"} />
      <Tile testId="apps-notifications" label="Notifications turned on" value={pushUsers} sub={(data.notificationsOn ?? []).map((r) => (r.platform === "ios" ? "iOS " : r.platform === "android" ? "Android " : r.platform + " ") + r.users).join(" · ") || "none yet"} />
      <Tile testId="apps-quick-signin" label="Quick sign-in set up" value={quick.biometric + quick.passkey} sub={`Face ID / fingerprint ${quick.biometric} · passkey ${quick.passkey}`} />
    </div>
  );
}

export function MobileAppsDeviceTable({ data }: { data: MobileAppsReport }) {
  return (
    <div style={card}>
      <h3 style={{ fontSize: 14, margin: "0 0 8px" }}>By device, last {data.days} days</h3>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }} data-testid="apps-device-table">
          <thead><tr><th style={th}>Device</th><th style={{ ...th, textAlign: "right" }}>Active users</th>{EVENT_LABEL.map(([k, l]) => <th key={k} style={{ ...th, textAlign: "right" }}>{l}</th>)}</tr></thead>
          <tbody>
            {(data.devices ?? []).map((d) => (
              <tr key={d}><td style={td}>{DEVICE_LABEL[d] ?? d}</td><td style={num}>{data.active?.[d]?.period ?? 0}</td>{EVENT_LABEL.map(([k]) => <td key={k} style={num}>{evCount(data, d, k)}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// BF_PORTAL_v819_MOBILE_REPORT - compact card for the Dashboard / Reports library: the five tiles and the by-device
// table, for the period the Dashboard has selected (7 / 30 / 90 days / 1 year).
export function MobileAppsSummary({ days }: { days: number }) {
  const { data, err } = useMobileAppsReport(days);
  return (
    <div className="space-y-3" data-testid="mobile-apps-summary" style={{ color: "var(--ui-text)", display: "grid", gap: 12 }}>
      {err && <div role="alert" style={{ color: "#991b1b", fontWeight: 600 }}>{err}</div>}
      {!data && !err && <div style={{ color: "var(--ui-text-muted)" }}>Loading...</div>}
      {data && <><MobileAppsTiles data={data} /><MobileAppsDeviceTable data={data} /></>}
    </div>
  );
}

export default function MobileAppsPanel() {
  const [days, setDays] = useState(30);
  const { data, err } = useMobileAppsReport(days);

  const devices = data?.devices ?? [];
  const ev = (d: string, e: string) => (data ? evCount(data, d, e) : 0);
  const appVsWeb = (e: string) => ({ app: devices.filter(appOnly).reduce((n, d) => n + ev(d, e), 0), web: ev("web", e) });

  return (
    <div className="space-y-4" data-testid="mobile-apps-panel" style={{ color: "var(--ui-text)" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <h2 style={{ fontSize: 18, margin: 0, flex: 1 }}>Mobile apps</h2>
        {PERIODS.map((p) => (
          <button key={p} type="button" className={`ui-button ${days === p ? "ui-button--primary" : "ui-button--secondary"}`} onClick={() => setDays(p)} aria-pressed={days === p}>
            {p === 365 ? "1 year" : p + " days"}
          </button>
        ))}
      </div>
      <p style={{ margin: 0, fontSize: 13, color: "var(--ui-text-muted)" }}>
        Usage of the Boreal Financial client app. People are counted by device, without names or phone numbers. Counting starts with app version 1.0 (Oct 2026).
      </p>
      {err && <div role="alert" style={{ color: "#991b1b", fontWeight: 600 }}>{err}</div>}
      {!data && !err && <div style={{ color: "var(--ui-text-muted)" }}>Loading...</div>}
      {data && <>
        <MobileAppsTiles data={data} />

        <div style={card}><DailyBars daily={data.daily} days={data.days} /></div>

        <MobileAppsDeviceTable data={data} />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
          <div style={card} data-testid="apps-vs-web">
            <h3 style={{ fontSize: 14, margin: "0 0 8px" }}>App vs web</h3>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th} /><th style={{ ...th, textAlign: "right" }}>App</th><th style={{ ...th, textAlign: "right" }}>Web</th></tr></thead>
              <tbody>{EVENT_LABEL.filter(([k]) => k !== "open").map(([k, l]) => { const v = appVsWeb(k); return <tr key={k}><td style={td}>{l}</td><td style={num}>{v.app}</td><td style={num}>{v.web}</td></tr>; })}</tbody>
            </table>
          </div>
          <div style={card} data-testid="apps-signin-methods">
            <h3 style={{ fontSize: 14, margin: "0 0 8px" }}>How people sign in</h3>
            {data.signInMethods.length === 0 ? <p style={{ fontSize: 13, color: "var(--ui-text-muted)", margin: 0 }}>No sign-ins yet.</p> :
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th style={th}>Method</th><th style={th}>Device</th><th style={{ ...th, textAlign: "right" }}>Sign-ins</th></tr></thead>
                <tbody>{data.signInMethods.map((r, i) => <tr key={i}><td style={td}>{METHOD_LABEL[r.method] ?? r.method}</td><td style={td}>{DEVICE_LABEL[r.device] ?? r.device}</td><td style={num}>{r.count}</td></tr>)}</tbody>
              </table>}
          </div>
          <div style={card} data-testid="apps-versions">
            <h3 style={{ fontSize: 14, margin: "0 0 8px" }}>App versions in use</h3>
            {data.versions.length === 0 ? <p style={{ fontSize: 13, color: "var(--ui-text-muted)", margin: 0 }}>No phone or tablet use yet.</p> :
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th style={th}>Version</th><th style={th}>Device</th><th style={{ ...th, textAlign: "right" }}>Users</th><th style={th}>Last seen</th></tr></thead>
                <tbody>{data.versions.map((r, i) => <tr key={i}><td style={td}>{r.version}</td><td style={td}>{DEVICE_LABEL[r.device] ?? r.device}</td><td style={num}>{r.users}</td><td style={td}>{r.lastSeen}</td></tr>)}</tbody>
              </table>}
          </div>
        </div>

        <div style={card} data-testid="apps-stores">
          <h3 style={{ fontSize: 14, margin: "0 0 8px" }}>Store downloads</h3>
          {(["apple", "google"] as const).map((k) => (
            <div key={k} style={{ display: "flex", gap: 10, alignItems: "baseline", padding: "6px 0", borderTop: "1px solid var(--ui-border)" }}>
              <strong style={{ minWidth: 150 }}>{k === "apple" ? "Apple App Store" : "Google Play"}</strong>
              <span style={{ fontSize: 13, color: "var(--ui-text-muted)" }}>{data.stores[k].connected ? "Connected" : "Not connected yet. " + data.stores[k].note}</span>
            </div>
          ))}
        </div>
      </>}
    </div>
  );
}
