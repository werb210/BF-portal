// BF_PORTAL_v786_WORKFLOW_BUILDER - Settings, Performance and History tabs.
import { useEffect, useState } from "react";
import type { Enrollment, Performance } from "./workflowApi";
import { workflowApi, errorText } from "./workflowApi";
import { defOf } from "./actions";
import type { Catalog, Goal, Settings, Silo, WorkflowNode } from "./types";
import { ConditionRows, Field, btn, input, muted, primary } from "./ui";

const panel: React.CSSProperties = { maxWidth: 760, margin: "0 auto", padding: 24, color: "var(--ui-text)" };
const section: React.CSSProperties = { background: "var(--ui-surface-strong)", border: "1px solid var(--ui-border)", borderRadius: 8, padding: 16, marginBottom: 16 };
const h3: React.CSSProperties = { margin: "0 0 10px", fontSize: 15 };

export function SettingsTab({ catalog, silo, settings, goal, onChange }: { catalog: Catalog; silo: Silo; settings: Settings; goal: Goal; onChange: (change: { silo?: Silo; settings?: Settings; goal?: Goal }) => void }) {
  const set = (change: Partial<Settings>) => onChange({ settings: { ...settings, ...change } });
  const qh = settings.quietHours;
  return (
    <div style={panel} data-testid="settings-tab">
      <section style={section}>
        <h3 style={h3}>Business</h3>
        <Field title="Silo" hint="Which business this workflow runs for.">
          <select aria-label="Silo" value={silo} onChange={(e) => onChange({ silo: e.target.value as Silo })} style={input}>
            <option value="BF">BF - Boreal Financial</option>
            <option value="BI">BI - Boreal Insurance</option>
          </select>
        </Field>
      </section>
      <section style={section}>
        <h3 style={h3}>Re-enrollment</h3>
        <select aria-label="Re-enrollment setting" value={settings.reenroll} onChange={(e) => set({ reenroll: e.target.value as Settings["reenroll"] })} style={{ ...input, width: "100%" }}>
          <option value="never">Off - a contact goes through once</option>
          <option value="after_complete">On - again after they finish</option>
          <option value="always">On - every time a trigger happens</option>
        </select>
      </section>
      <section style={section}>
        <h3 style={h3}>Quiet hours</h3>
        <label style={{ fontSize: 13, display: "block", marginBottom: 8 }}>
          <input type="checkbox" checked={qh.enabled} onChange={(e) => set({ quietHours: { ...qh, enabled: e.target.checked } })} /> Hold texts and emails during quiet hours and send them when quiet hours end
        </label>
        {qh.enabled && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <label style={{ fontSize: 13 }}>From <input aria-label="Quiet hours start" type="time" value={qh.start} onChange={(e) => set({ quietHours: { ...qh, start: e.target.value } })} style={input} /></label>
            <label style={{ fontSize: 13 }}>to <input aria-label="Quiet hours end" type="time" value={qh.end} onChange={(e) => set({ quietHours: { ...qh, end: e.target.value } })} style={input} /></label>
            <label style={{ fontSize: 13 }}>Time zone <select aria-label="Time zone" value={qh.tz} onChange={(e) => set({ quietHours: { ...qh, tz: e.target.value } })} style={input}>
              {["America/Vancouver", "America/Edmonton", "America/Regina", "America/Winnipeg", "America/Toronto", "America/Halifax", "America/St_Johns"].map((tz) => <option key={tz} value={tz}>{tz}</option>)}
            </select></label>
          </div>
        )}
      </section>
      <section style={section}>
        <h3 style={h3}>Test mode</h3>
        <label style={{ fontSize: 13 }}>
          <input type="checkbox" checked={settings.testMode} onChange={(e) => set({ testMode: e.target.checked })} /> Test mode - log what each step would do; send nothing and change nothing
        </label>
      </section>
      <section style={section} data-testid="goal-section">
        <h3 style={h3}>Workflow goal</h3>
        <div style={{ ...muted, marginBottom: 8 }}>Contacts leave the workflow when they meet the goal.</div>
        {goal ? (
          <>
            <ConditionRows catalog={catalog} conditions={goal.conditions} logic={goal.logic} onLogic={(logic) => onChange({ goal: { ...goal, logic } })} onChange={(conditions) => onChange({ goal: { ...goal, conditions } })} />
            <label style={{ fontSize: 13, display: "block", marginTop: 8 }}>
              <input type="checkbox" checked={settings.unenrollOnGoal} onChange={(e) => set({ unenrollOnGoal: e.target.checked })} /> Unenroll contacts as soon as they meet the goal
            </label>
            <button type="button" style={{ ...btn, marginTop: 8 }} onClick={() => onChange({ goal: null })}>Remove goal</button>
          </>
        ) : (
          <button type="button" style={btn} onClick={() => onChange({ goal: { logic: "all", conditions: [{ field: "", op: catalog.operators[0] ?? "eq", value: "" }] } })}>Set a goal</button>
        )}
      </section>
    </div>
  );
}

const pct = (n: number, of: number) => (of > 0 ? Math.round((n / of) * 100) : 0);

export function PerformanceStats({ perf }: { perf: Performance | null }) {
  if (!perf) return <div style={{ ...muted, padding: 16 }}>Loading performance...</div>;
  const tiles: Array<[string, string]> = [
    ["Enrolled", String(perf.enrolled)],
    ["Active", String(perf.active)],
    ["Completed", String(perf.completed)],
    ["Goal reached", perf.goalReached + " (" + pct(perf.goalReached, perf.enrolled) + "%)"],
  ];
  return (
    <div data-testid="performance-stats" style={{ display: "flex", gap: 12, flexWrap: "wrap", padding: 16, background: "var(--ui-surface-strong)", borderBottom: "1px solid var(--ui-border)" }}>
      {tiles.map(([k, v]) => (
        <div key={k} style={{ minWidth: 140, padding: "10px 14px", border: "1px solid var(--ui-border)", borderRadius: 8 }}>
          <div style={muted}>{k}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "var(--ui-text)" }}>{v}</div>
        </div>
      ))}
      <div style={{ ...muted, alignSelf: "center" }}>Each card on the canvas shows how many contacts reached that step.</div>
    </div>
  );
}

export function HistoryPanel({ workflowId, items, selected, onSelect, nodes, numbers, onEnrolled }: {
  workflowId: string | null; items: Enrollment[] | null; selected: string | null; onSelect: (id: string | null) => void;
  nodes: Record<string, WorkflowNode>; numbers: Record<string, number>; onEnrolled: () => void;
}) {
  const [enrolling, setEnrolling] = useState(false);
  const stepName = (id: string | null) => {
    if (!id) return "-";
    const n = nodes[id];
    return (numbers[id] ? numbers[id] + ". " : "") + (n ? defOf(n)?.title ?? "Step" : "Removed step");
  };
  const current = items?.find((e) => e.id === selected) ?? null;
  return (
    <div data-testid="history-panel" style={{ padding: 16, color: "var(--ui-text)", overflowY: "auto", height: "100%", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
        <h3 style={{ margin: 0, fontSize: 15, flex: 1 }}>Enrollment history</h3>
        <button type="button" style={primary} disabled={!workflowId} onClick={() => setEnrolling(true)}>Enroll contact</button>
      </div>
      {enrolling && workflowId && <EnrollBox workflowId={workflowId} onDone={() => { setEnrolling(false); onEnrolled(); }} onCancel={() => setEnrolling(false)} />}
      {items === null ? <div style={muted}>Loading...</div> : items.length === 0 ? <div style={muted}>No contacts have been enrolled yet.</div> : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr style={{ textAlign: "left", color: "var(--ui-text-muted)" }}><th style={{ padding: 6 }}>Contact</th><th style={{ padding: 6 }}>Enrolled at</th><th style={{ padding: 6 }}>Status</th><th style={{ padding: 6 }}>Current step</th></tr></thead>
          <tbody>
            {items.map((e) => (
              <tr key={e.id} data-testid="history-row" onClick={() => onSelect(selected === e.id ? null : e.id)} aria-selected={selected === e.id}
                style={{ cursor: "pointer", borderTop: "1px solid var(--ui-border)", background: selected === e.id ? "var(--ui-surface-muted)" : "transparent" }}>
                <td style={{ padding: 6, fontWeight: 600 }}>{e.contactName}</td>
                <td style={{ padding: 6 }}>{e.enrolledAt ? new Date(e.enrolledAt).toLocaleString() : "-"}</td>
                <td style={{ padding: 6, textTransform: "capitalize" }}>{e.status.replace(/_/g, " ")}</td>
                <td style={{ padding: 6 }}>{stepName(e.currentNodeId)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {current && (
        <div data-testid="history-steps" style={{ marginTop: 16 }}>
          <h4 style={{ margin: "0 0 6px", fontSize: 14 }}>{current.contactName}: path through the workflow</h4>
          {current.steps.length === 0 ? <div style={muted}>No steps have run yet.</div> : (
            <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
              {current.steps.map((s, i) => (
                <li key={i} style={{ marginBottom: 4 }}>
                  <strong>{stepName(s.nodeId)}</strong> - {s.result || "done"}{s.detail ? " (" + s.detail + ")" : ""} <span style={muted}>{s.at ? new Date(s.at).toLocaleString() : ""}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}

function EnrollBox({ workflowId, onDone, onCancel }: { workflowId: string; onDone: () => void; onCancel: () => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Array<{ id: string; name: string; email?: string | null }>>([]);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(() => { workflowApi.searchContacts(q.trim()).then(setResults).catch(() => setResults([])); }, 250);
    return () => clearTimeout(t);
  }, [q]);
  const enroll = async (contactId: string) => {
    setMsg(null);
    try { await workflowApi.enroll(workflowId, contactId); onDone(); }
    catch (e) { setMsg(errorText(e, "Could not enroll that contact.")); }
  };
  return (
    <div data-testid="enroll-box" style={{ border: "1px solid var(--ui-border)", borderRadius: 8, padding: 10, marginBottom: 12 }}>
      <input aria-label="Search contacts" placeholder="Search contacts by name or email" value={q} onChange={(e) => setQ(e.target.value)} style={{ ...input, width: "100%", boxSizing: "border-box" }} autoFocus />
      {results.map((r) => (
        <button key={r.id} type="button" onClick={() => void enroll(r.id)} style={{ display: "block", width: "100%", textAlign: "left", padding: "6px 8px", border: "none", borderBottom: "1px solid var(--ui-border)", background: "transparent", color: "var(--ui-text)", cursor: "pointer", fontSize: 13 }}>
          <strong>{r.name}</strong>{r.email ? <span style={muted}> - {r.email}</span> : null}
        </button>
      ))}
      {msg && <div role="alert" style={{ color: "var(--wf-danger)", fontSize: 13, marginTop: 6 }}>{msg}</div>}
      <button type="button" style={{ ...btn, marginTop: 8 }} onClick={onCancel}>Cancel</button>
    </div>
  );
}
