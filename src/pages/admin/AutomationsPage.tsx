// BF_PORTAL_AUTOMATION_BUILDER_v680 - the automation builder over BF-Server's v616 engine
// (GET /api/automations/catalog drives every choice, so the screen and the engine agree):
// the list of automations, on / off, edit, delete, and a Runs panel (test run, step log, stop).
// The rule editor lives in automationBuilder.tsx.
import { useEffect, useMemo, useState } from "react";
import { api } from "@/api";
import { Builder, btn, card, describeRule, input, primary, small, unwrap, type Catalog, type Rule, type Run, type User } from "./automationBuilder";
export { describeRule, newStep, stepProblem } from "./automationBuilder";

function Runs({ rule, onClose }: { rule: Rule; onClose: () => void }) {
  const [runs, setRuns] = useState<Run[] | null>(null);
  const [log, setLog] = useState<Record<string, Array<{ step_index: number; step_type: string; outcome: string; detail?: string | null; created_at: string }>>>({});
  const [target, setTarget] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const load = () => void api.get("/api/automations/" + rule.id + "/enrollments").then((r) => setRuns(unwrap<Run[]>(r) ?? [])).catch(() => setRuns([]));
  useEffect(load, [rule.id]);
  async function test() {
    const id = target.trim().match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0];
    if (!id) { setMsg("Paste a contact or application link or id"); return; }
    const isApp = /applications/.test(target);
    try { await api.post("/api/automations/" + rule.id + "/enroll", { [isApp ? "applicationId" : "contactId"]: id, testMode: true }); setMsg("Test run done - see below"); load(); }
    catch { setMsg("Couldn't start a test run"); }
  }
  async function openLog(id: string) {
    try { const r = await api.get("/api/automations/enrollments/" + id + "/log"); setLog((l) => ({ ...l, [id]: unwrap(r) ?? [] })); } catch { setLog((l) => ({ ...l, [id]: [] })); }
  }
  return (
    <div style={card} data-testid="automation-runs">
      <div style={{ display: "flex", justifyContent: "space-between" }}><b>Runs: {rule.name}</b><button type="button" style={btn} onClick={onClose}>Close</button></div>
      <div style={{ display: "flex", gap: 6, margin: "10px 0" }}>
        <input aria-label="Test on" placeholder="Contact or application link / id" value={target} onChange={(e) => setTarget(e.target.value)} style={{ ...input, flex: 1 }} />
        <button type="button" style={btn} onClick={() => void test()}>Test run</button>
      </div>
      {msg && <div style={small}>{msg}</div>}
      {runs === null ? <div style={small}>Loading{"\u2026"}</div> : runs.length === 0 ? <div style={small}>No runs yet.</div> : runs.map((r) => (
        <div key={r.id} style={{ borderTop: "1px solid var(--ui-border)", padding: "8px 0", fontSize: 13 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <b>{r.label || "Run"}</b><span>{r.status}{r.test_mode ? " (test)" : ""}</span><span style={small}>{new Date(r.created_at).toLocaleString()}</span>
            {r.next_run_at && r.status === "active" && <span style={small}>next step {new Date(r.next_run_at).toLocaleString()}</span>}
            {r.last_error && <span style={{ color: "#ff3b30" }}>{r.last_error}</span>}
            <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
              <button type="button" style={btn} onClick={() => void openLog(r.id)}>Log</button>
              {r.status === "active" && <button type="button" style={btn} onClick={() => void api.post("/api/automations/enrollments/" + r.id + "/stop", {}).then(load).catch(load)}>Stop</button>}
            </span>
          </div>
          {log[r.id] && <ol style={{ margin: "6px 0 0 18px", ...small }}>{log[r.id]!.map((l, i) => <li key={i}>{l.step_type}: {l.outcome}{l.detail ? " - " + l.detail : ""}</li>)}</ol>}
        </div>))}
    </div>);
}

export default function AutomationsPage(): JSX.Element {
  const [cat, setCat] = useState<Catalog | null>(null);
  const [rules, setRules] = useState<Rule[] | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [editing, setEditing] = useState<Rule | "new" | null>(null);
  const [runsFor, setRunsFor] = useState<Rule | null>(null);
  const load = () => void api.get("/api/automations").then((r) => setRules(unwrap<Rule[]>(r) ?? [])).catch(() => setRules([]));
  useEffect(() => {
    void api.get("/api/automations/catalog").then((r) => setCat(unwrap<Catalog>(r))).catch(() => setCat(null));
    void api.get<{ users?: Array<{ id: string; first_name?: string; last_name?: string; email?: string }> } | Array<{ id: string; first_name?: string; last_name?: string; email?: string }>>("/api/users")
      .then((r) => setUsers((Array.isArray(r) ? r : r.users ?? []).map((u) => ({ id: u.id, name: [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email || u.id })))).catch(() => setUsers([]));
    load();
  }, []);
  const sorted = useMemo(() => [...(rules ?? [])].sort((a, b) => Number(b.enabled) - Number(a.enabled) || a.name.localeCompare(b.name)), [rules]);
  const toggle = (r: Rule) => void api.patch("/api/automations/" + r.id, { enabled: !r.enabled }).then(load).catch(() => window.alert("Only admins can turn automations on or off."));
  const del = (r: Rule) => { if (window.confirm('Delete "' + r.name + '"?')) void api.delete("/api/automations/" + r.id).then(load).catch(() => window.alert("Couldn't delete it.")); };

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
        <h1 style={{ fontSize: 20, margin: 0 }}>Automations</h1>
        {cat && !editing && <button type="button" style={{ ...primary, marginLeft: "auto" }} onClick={() => setEditing("new")}>+ New automation</button>}
      </div>
      <p style={{ ...small, fontSize: 13, marginBottom: 16 }}>When something happens (a stage change, a rejected document, a message, a missed call, a new contact), run steps automatically.</p>
      {!cat && <div style={small}>Loading the builder{"\u2026"}</div>}
      {cat && editing && <Builder cat={cat} users={users} rule={editing === "new" ? null : editing} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {runsFor && <Runs rule={runsFor} onClose={() => setRunsFor(null)} />}
      {rules?.length === 0 && !editing && <div style={card}>No automations yet.</div>}
      {sorted.map((r) => (
        <div key={r.id} style={{ ...card, opacity: r.enabled ? 1 : 0.7 }} data-testid="automation-rule">
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <b>{r.name}</b>
            <span style={{ ...small, padding: "1px 8px", borderRadius: 10, border: "1px solid var(--ui-border)" }}>{r.enabled ? "On" : "Off"}{r.test_mode ? " \u00B7 test mode" : ""}</span>
            <span style={small}>{r.active_count ?? 0} running {"\u00B7"} {r.total_count ?? 0} total</span>
            <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
              <button type="button" style={btn} onClick={() => toggle(r)}>{r.enabled ? "Turn off" : "Turn on"}</button>
              <button type="button" style={btn} onClick={() => setEditing(r)}>Edit</button>
              <button type="button" style={btn} onClick={() => setRunsFor(r)}>Runs</button>
              <button type="button" style={btn} onClick={() => del(r)}>Delete</button>
            </span>
          </div>
          <div style={{ ...small, fontSize: 13, marginTop: 6 }}>{describeRule(r, cat)}</div>
          {r.description && <div style={{ ...small, marginTop: 2 }}>{r.description}</div>}
        </div>))}
    </div>);
}
