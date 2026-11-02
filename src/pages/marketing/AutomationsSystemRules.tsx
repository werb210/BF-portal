// BF_PORTAL_v864_CONTENT_TAB - the built-in system rules list, moved out of Marketing > Automations so Settings >
// Content > Automations can show it under the automation builder.
import { useEffect, useState } from "react";
import { api } from "@/api";

// BF_PORTAL_AUTOMATIONS_v1 - read-only list of active background automations from GET /api/marketing/automations.
type AutomationRow = { id: string; name: string; type: string; cadence: string; trigger: string; action: string; status: string };
export default function AutomationsSystemRules() {
  const [rows, setRows] = useState<AutomationRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    api.get<{ data?: { items?: AutomationRow[] }; items?: AutomationRow[] }>("/api/marketing/automations")
      .then((r) => { if (!cancelled) setRows(r?.data?.items ?? r?.items ?? []); })
      .catch(() => { if (!cancelled) setRows([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);
  const scheduled = rows.filter((r) => r.type === "scheduled");
  const events = rows.filter((r) => r.type === "event");
  const card = (r: AutomationRow) => (
    <div key={r.id} style={{ border: "1px solid var(--ui-border)", borderRadius: 10, padding: "12px 14px", background: "var(--ui-surface-strong)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div style={{ fontWeight: 600, color: "var(--ui-text)" }}>{r.name}</div>
        <span style={{ fontSize: 11, color: "#16a34a", border: "1px solid #16a34a55", borderRadius: 999, padding: "1px 8px" }}>{r.status}</span>
      </div>
      <div style={{ fontSize: 13, color: "var(--ui-text)", marginTop: 6 }}><strong>When:</strong> {r.trigger}</div>
      <div style={{ fontSize: 13, color: "var(--ui-text)", marginTop: 2 }}><strong>Then:</strong> {r.action}</div>
      <div style={{ fontSize: 11, color: "var(--ui-text-muted)", marginTop: 6 }}>{r.cadence}</div>
    </div>
  );
  return (
    <section className="drawer-section">
      <div className="drawer-section__title mb-2">Built-in system rules</div>
      <p style={{ color: "var(--ui-text-muted)", fontSize: "0.85rem", marginBottom: 12 }}>These run automatically and cannot be edited. Your own automations are above.</p>
      {loading ? (
        <p style={{ color: "var(--ui-text-muted)", fontSize: "0.85rem" }}>Loading&hellip;</p>
      ) : rows.length === 0 ? (
        <p style={{ color: "var(--ui-text-muted)", fontSize: "0.85rem" }}>No automations reported.</p>
      ) : (
        <div className="space-y-4">
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ui-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>Scheduled &amp; polling</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>{scheduled.map(card)}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ui-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>Event-driven</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>{events.map(card)}</div>
          </div>
        </div>
      )}
    </section>
  );
}
