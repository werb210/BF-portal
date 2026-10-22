// BF_PORTAL_v846_FRAUD - Settings -> Fraud protection (Admins only; ported from Keystone, no plans): the Keystone shared
// watchlist opt-in, whether the pre-screen page goes into lender packages by default, which outside services are set
// up, and recent inside-job alerts. Each switch saves on its own. The watchlist switch is off and disabled until the
// server's Keystone link (KS_OPS_URL, KS_LICENSEE_ID, KS_OPS_KEY, KS_WATCHLIST_PEPPER) is set up.
import { useEffect, useState, type CSSProperties } from "react";
import toast from "react-hot-toast";
import { fraudApi, type FraudSettingsView, type StaffAlert } from "@/fraud/fraudApi";
import { StatusChip } from "@/fraud/FraudTab";
import { noticeStyle } from "@/fraud/status";
import { card, muted } from "@/fraud/ui";

const row: CSSProperties = { display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 0", borderTop: "1px solid var(--ui-border)", flexWrap: "wrap" };
const toggle: CSSProperties = { display: "flex", gap: 6, alignItems: "center", fontSize: 14, whiteSpace: "nowrap", color: "var(--ui-text)" };

const ALERT_TEXT: Record<string, string> = {
  banking_details_changed: "changed the banking details on a file",
  approved_own_file: "moved a file they own to Accepted",
  bulk_export: "exported data in bulk",
  off_hours: "changed several files during the night",
  high_volume: "opened an unusual number of files in an hour",
};

const say = (kind: "success" | "error", text: string) => { try { toast[kind](text); } catch { /* no toaster mounted */ } };

export default function FraudProtectionCard() {
  const [view, setView] = useState<FraudSettingsView | null>(null);
  const [alerts, setAlerts] = useState<StaffAlert[] | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let live = true;
    Promise.resolve().then(() => fraudApi.settings()).then((v) => {
      if (!live) return;
      if (!v || !v.settings || !Array.isArray(v.services) || !v.watchlist) { setFailed("Fraud protection is not available on this server yet."); return; }
      setView(v);
      Promise.resolve().then(() => fraudApi.staffAlerts())
        .then((a) => { if (live) setAlerts(Array.isArray(a?.alerts) ? a.alerts : []); })
        .catch(() => { if (live) setAlerts([]); });
    }).catch((e) => { if (live) setFailed((e as Error)?.message || "Could not load fraud protection."); });
    return () => { live = false; };
  }, []);

  if (failed) return <p role="alert" style={noticeStyle("error")}>{failed}</p>;
  if (!view) return <p role="status" style={{ color: "var(--ui-text)" }}>Loading fraud protection…</p>;

  const save = async (patch: { watchlist_opt_in?: boolean; include_prescreen_in_package?: boolean }) => {
    setSaving(true);
    try {
      const r = await fraudApi.saveSettings(patch);
      setView({ ...view, settings: r.settings });
      const note = r.ops && !r.ops.told && patch.watchlist_opt_in !== undefined ? " The Keystone watchlist could not be told yet; it will be when the link answers." : "";
      say("success", `Fraud protection saved.${note}`);
    } catch (e) {
      say("error", (e as Error)?.message || "Could not save.");
    } finally { setSaving(false); }
  };
  const watchReady = view.watchlist.ready;

  return (
    <section style={card} data-testid="settings-section-fraud">
      <h3 style={{ margin: "0 0 4px", fontSize: 16, color: "var(--ui-text)" }}>Fraud protection</h3>
      <p style={{ ...muted, margin: "0 0 8px" }}>Every application is checked automatically with all 15 checks. Results appear on each application's Fraud check tab.</p>

      <div style={row}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <strong style={{ fontSize: 14, color: "var(--ui-text)" }}>Share confirmed fraud with the Keystone watchlist</strong>
          <p style={muted}>When a file is marked as fraud, scrambled codes of its phone, email, business number, address and bank account are shared with other brokerages in the Keystone network - never the details themselves. New applicants are checked against what they reported. Turning this off removes everything Boreal shared.</p>
          {!watchReady && <p data-testid="watchlist-not-set-up" style={noticeStyle("warning")}>Not set up: the server needs the Keystone watchlist link (KS_OPS_URL, KS_LICENSEE_ID, KS_OPS_KEY and KS_WATCHLIST_PEPPER) before this can be turned on.</p>}
        </div>
        <label style={toggle}>
          <input type="checkbox" data-testid="watchlist-opt-in" checked={view.settings.watchlist_opt_in} disabled={saving || (!watchReady && !view.settings.watchlist_opt_in)} onChange={(e) => void save({ watchlist_opt_in: e.target.checked })} />
          {view.settings.watchlist_opt_in ? "On" : "Off"}
        </label>
      </div>

      <div style={row}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <strong style={{ fontSize: 14, color: "var(--ui-text)" }}>Add the fraud pre-screen page to lender packages</strong>
          <p style={muted}>The default for every file. Staff can still change it on each application's Fraud check tab.</p>
        </div>
        <label style={toggle}>
          <input type="checkbox" data-testid="prescreen-default" checked={view.settings.include_prescreen_in_package} disabled={saving} onChange={(e) => void save({ include_prescreen_in_package: e.target.checked })} />
          {view.settings.include_prescreen_in_package ? "On" : "Off"}
        </label>
      </div>

      <details style={{ borderTop: "1px solid var(--ui-border)", paddingTop: 10 }}>
        <summary style={{ cursor: "pointer", fontSize: 14, fontWeight: 600, color: "var(--ui-text)" }}>Outside services the checks use</summary>
        <ul style={{ listStyle: "none", margin: "8px 0 0", padding: 0 }} data-testid="fraud-services">
          {view.services.map((s) => (
            <li key={s.key} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", padding: "4px 0", fontSize: 13 }}>
              <StatusChip status={s.configured ? "green" : "not_configured"} />
              <span style={{ color: "var(--ui-text)" }}>{s.label}</span>
              {!s.configured && <span style={{ color: "var(--ui-text-muted)" }}>({s.setting})</span>}
            </li>
          ))}
        </ul>
        <p style={muted}>A check whose service is not set up says so on the application; it never counts as a pass.</p>
      </details>

      <div style={{ borderTop: "1px solid var(--ui-border)", paddingTop: 10, marginTop: 10 }} data-testid="staff-alerts">
        <strong style={{ fontSize: 14, color: "var(--ui-text)" }}>Staff activity to review</strong>
        {alerts === null ? <p style={muted}>Loading…</p> : alerts.length === 0 ? <p style={muted}>Nothing unusual recorded.</p> : (
          <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 13, lineHeight: 1.6 }}>
            {alerts.slice(0, 10).map((a) => (
              <li key={a.id} style={{ color: "var(--ui-text)" }}>
                {new Date(a.created_at).toLocaleString()} - {a.staff_name ?? "A staff member"} {ALERT_TEXT[a.kind] ?? a.kind.replace(/_/g, " ")}
                {a.application_id && <> (<a href={`/applications/${encodeURIComponent(a.application_id)}/fraud`} style={{ color: "inherit", fontWeight: 700 }}>open file</a>)</>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
