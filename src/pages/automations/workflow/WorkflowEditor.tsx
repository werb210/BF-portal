// BF_PORTAL_v786_WORKFLOW_BUILDER - full-screen HubSpot-style workflow editor at
// /automations/:id (and /automations/new). Dark header bar with the editable name, On/Off,
// Save and Review issues; tabs Actions | Settings | Performance | History.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import "./workflow.css";
import { defOf } from "./actions";
import type { FormContext } from "./DetailForms";
import { GraphError, cloneAfter, deleteBranch, deleteStep, detachedCopy, exitsOf, insertAt, missingParams, moveNode, numberNodes } from "./graph";
import { newId } from "./actions";
import { InsertPanel, PanelShell, StepDetails, TriggerPanel } from "./SidePanel";
import { HistoryPanel, PerformanceStats, SettingsTab } from "./Tabs";
import type { Catalog, Issue, ListRef, Slot, UserRef, Workflow, WorkflowNode, WorkflowRef } from "./types";
import { emptyWorkflow } from "./types";
import { Icon, NAVY, btn, linkBtn, muted, primary } from "./ui";
import WorkflowCanvas from "./WorkflowCanvas";
import { errorText, workflowApi, type Enrollment, type Performance } from "./workflowApi";

type Tab = "actions" | "settings" | "performance" | "history";
type Panel = null | { type: "insert"; slot: Slot } | { type: "edit"; nodeId: string } | { type: "trigger" } | { type: "issues" } | { type: "delete"; nodeId: string };

const EMPTY_CATALOG: Catalog = { triggers: [], fields: [], operators: ["eq", "neq", "contains", "is_set", "is_not_set"], templates: { email: [], sms: [] }, stages: [], events: [], tokens: [] };

/** Problems the editor can see without asking the server (missing params, no trigger). */
export function localIssues(wf: Workflow): Issue[] {
  const out: Issue[] = [];
  if (wf.graph.triggers.length === 0) out.push({ nodeId: null, message: "Choose at least one enrollment trigger." });
  if (!wf.graph.startNodeId) out.push({ nodeId: null, message: "Add at least one action." });
  const numbers = numberNodes(wf.graph);
  for (const [id, node] of Object.entries(wf.graph.nodes)) {
    if (numbers[id] === undefined) continue;
    for (const m of missingParams(node, wf.graph.nodes)) out.push({ nodeId: id, message: m });
  }
  return out;
}

export function mergeIssues(a: Issue[], b: Issue[]): Issue[] {
  const seen = new Set<string>();
  return [...a, ...b].filter((i) => { const k = (i.nodeId ?? "") + "|" + i.message; if (seen.has(k)) return false; seen.add(k); return true; });
}

export default function WorkflowEditor() {
  const { id: routeId = "new" } = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const isNew = routeId === "new";
  const [wf, setWf] = useState<Workflow | null>(isNew ? emptyWorkflow(search.get("silo") === "BI" ? "BI" : "BF") : null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<Catalog>(EMPTY_CATALOG);
  const [users, setUsers] = useState<UserRef[]>([]);
  const [lists, setLists] = useState<ListRef[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowRef[]>([]);
  const [tab, setTab] = useState<Tab>("actions");
  const [panel, setPanel] = useState<Panel>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [serverIssues, setServerIssues] = useState<Issue[]>([]);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [clipboard, setClipboard] = useState<WorkflowNode | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [perf, setPerf] = useState<Performance | null>(null);
  const [history, setHistory] = useState<Enrollment[] | null>(null);
  const [selectedEnrollment, setSelectedEnrollment] = useState<string | null>(null);
  const workflowId = isNew ? null : routeId;

  useEffect(() => {
    void workflowApi.catalog().then(setCatalog).catch(() => setCatalog(EMPTY_CATALOG));
    void workflowApi.users().then(setUsers).catch(() => setUsers([]));
    void workflowApi.lists().then(setLists).catch(() => setLists([]));
    void workflowApi.workflows().then(setWorkflows).catch(() => setWorkflows([]));
  }, []);

  useEffect(() => {
    if (!workflowId) return;
    let cancelled = false;
    workflowApi.get(workflowId).then((w) => { if (!cancelled) { setWf(w); setDirty(false); } }).catch((e) => { if (!cancelled) setLoadError(errorText(e, "Could not load this workflow.")); });
    workflowApi.validate(workflowId).then((i) => { if (!cancelled) setServerIssues(i); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [workflowId]);

  const loadHistory = useCallback(() => {
    if (!workflowId) { setHistory([]); return; }
    workflowApi.history(workflowId).then(setHistory).catch(() => setHistory([]));
  }, [workflowId]);

  useEffect(() => {
    if (tab === "performance") {
      if (!workflowId) setPerf({ enrolled: 0, active: 0, completed: 0, goalReached: 0, steps: {} });
      else workflowApi.performance(workflowId).then(setPerf).catch(() => setPerf({ enrolled: 0, active: 0, completed: 0, goalReached: 0, steps: {} }));
    }
    if (tab === "history") loadHistory();
  }, [tab, workflowId, loadHistory]);

  const numbers = useMemo(() => (wf ? numberNodes(wf.graph) : {}), [wf]);
  const issues = useMemo(() => (wf ? mergeIssues(localIssues(wf), serverIssues.filter((i) => !i.nodeId || wf.graph.nodes[i.nodeId])) : []), [wf, serverIssues]);
  const issuesByNode = useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const i of serverIssues) if (i.nodeId) (out[i.nodeId] ??= []).push(i.message);
    return out;
  }, [serverIssues]);
  const highlight = useMemo(() => {
    const e = history?.find((x) => x.id === selectedEnrollment);
    return e ? new Set([...e.steps.map((s) => s.nodeId), ...(e.currentNodeId ? [e.currentNodeId] : [])]) : null;
  }, [history, selectedEnrollment]);

  if (loadError) return <div style={{ padding: 24, color: "var(--wf-danger)" }}>{loadError}</div>;
  if (!wf) return <div style={{ padding: 24, color: "var(--ui-text)" }}>Loading workflow...</div>;

  const change = (next: Workflow) => { setWf(next); setDirty(true); };
  const changeGraph = (fn: (g: Workflow["graph"]) => Workflow["graph"]) => {
    try { change({ ...wf, graph: fn(wf.graph) }); return true; }
    catch (e) { setMessage({ ok: false, text: e instanceof GraphError ? e.message : "That change could not be made." }); return false; }
  };

  const ctx: FormContext = { catalog, users, lists, workflows, nodes: wf.graph.nodes, numbers, workflowId };

  async function save(next: Workflow = wf!): Promise<Workflow | null> {
    setSaving(true); setMessage(null);
    try {
      const saved = next.id ? await workflowApi.update(next.id, next) : await workflowApi.create(next);
      // Trust the server's copy only when it sent a workflow back; keep the local graph if it echoed none.
      const merged: Workflow = saved.id
        ? { ...saved, graph: saved.graph.startNodeId || Object.keys(saved.graph.nodes).length ? saved.graph : next.graph }
        : next;
      setWf(merged); setDirty(false);
      setMessage({ ok: true, text: "Saved." });
      if (!next.id && merged.id) navigate("/automations/" + encodeURIComponent(merged.id), { replace: true });
      if (merged.id) workflowApi.validate(merged.id).then(setServerIssues).catch(() => undefined);
      return merged;
    } catch (e) {
      setMessage({ ok: false, text: errorText(e, "Could not save. Only admins and marketing can change workflows.") });
      return null;
    } finally { setSaving(false); }
  }

  async function toggleEnabled() {
    if (wf!.enabled) { await save({ ...wf!, enabled: false }); return; }
    const saved = dirty || !wf!.id ? await save(wf!) : wf!;
    if (!saved) return;
    let found = localIssues(saved);
    if (saved.id) { try { const s = await workflowApi.validate(saved.id); setServerIssues(s); found = mergeIssues(found, s); } catch { /* fall back to local checks */ } }
    if (found.length) {
      setMessage({ ok: false, text: "This workflow can't be turned on yet: " + found.length + (found.length === 1 ? " issue needs" : " issues need") + " fixing. Open Review issues to see " + (found.length === 1 ? "it." : "them.") });
      return;
    }
    await save({ ...saved, enabled: true });
  }

  const onPlus = (slot: Slot) => {
    if (movingId) {
      if (changeGraph((g) => moveNode(g, movingId, slot))) setMessage(null);
      setMovingId(null);
      return;
    }
    setPanel({ type: "insert", slot });
  };

  const goToIssue = (nodeId: string | null) => {
    setTab("actions");
    if (!nodeId) { setPanel({ type: "trigger" }); return; }
    setPanel(null);
    setFlashId(nodeId);
    window.setTimeout(() => setFlashId((cur) => (cur === nodeId ? null : cur)), 2500);
  };

  const canvas = (mode: "edit" | "perf" | "history") => (
    <WorkflowCanvas
      graph={wf.graph}
      catalog={catalog}
      reenroll={wf.settings.reenroll}
      ctx={{ users, lists, workflows }}
      numbers={numbers}
      issues={issuesByNode}
      counts={mode === "perf" ? perf?.steps ?? {} : null}
      highlight={mode === "history" ? highlight : null}
      flashId={flashId}
      movingId={mode === "edit" ? movingId : null}
      readOnly={mode !== "edit"}
      onPlus={onPlus}
      onOpenNode={(nodeId) => { if (mode === "edit") setPanel({ type: "edit", nodeId }); }}
      onTrigger={() => { if (mode === "edit") setPanel({ type: "trigger" }); }}
      onCopy={(nodeId) => { const n = wf.graph.nodes[nodeId]; if (n) { setClipboard(detachedCopy(n)); setMessage({ ok: true, text: "Step copied. Click a + and choose Paste copied action." }); } }}
      onMove={(nodeId) => { setPanel(null); setMovingId(nodeId); }}
      onClone={(nodeId) => changeGraph((g) => cloneAfter(g, nodeId).graph)}
      onDelete={(nodeId) => setPanel({ type: "delete", nodeId })}
      onDropNode={(nodeId, slot) => changeGraph((g) => moveNode(g, nodeId, slot))}
    />
  );

  const tabBtn = (key: Tab, text: string) => (
    <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => { setTab(key); setPanel(null); setMovingId(null); }}
      style={{ background: "transparent", border: "none", borderBottom: "3px solid " + (tab === key ? "#5eead4" : "transparent"), color: "#fff", padding: "10px 14px", cursor: "pointer", fontSize: 14, fontWeight: tab === key ? 700 : 500 }}>{text}</button>
  );

  const deleting = panel?.type === "delete" ? wf.graph.nodes[panel.nodeId] : undefined;
  const hasBelow = deleting ? exitsOf(deleting).some((e) => e.target) : false;

  return (
    <div data-testid="workflow-editor" style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column", background: "var(--ui-bg, #fff)", zIndex: 50 }}>
      <header style={{ background: NAVY, color: "#fff", padding: "8px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button type="button" onClick={() => { if (dirty && !window.confirm("Leave without saving your changes?")) return; if (window.history.length > 1) navigate(-1); else navigate("/admin/automations"); }} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.5)", color: "#fff", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 13 }}>Back</button>
        {editingName ? (
          <input aria-label="Workflow name" autoFocus value={wf.name} onChange={(e) => change({ ...wf, name: e.target.value })} onBlur={() => setEditingName(false)} onKeyDown={(e) => { if (e.key === "Enter") setEditingName(false); }}
            style={{ fontSize: 16, fontWeight: 700, padding: "4px 8px", borderRadius: 6, border: "1px solid #94a3b8", background: "#fff", color: NAVY, minWidth: 220 }} />
        ) : (
          <button type="button" aria-label="Edit workflow name" onClick={() => setEditingName(true)} style={{ background: "transparent", border: "none", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, padding: 0 }}>
            <span data-testid="workflow-name">{wf.name}</span> <Icon.pencil />
          </button>
        )}
        <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.5)" }}>{wf.silo}{wf.settings.testMode ? " - test mode" : ""}</span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {dirty && <span style={{ fontSize: 12, color: "#e2e8f0" }}>Unsaved changes</span>}
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
            <span>{wf.enabled ? "On" : "Off"}</span>
            <button type="button" role="switch" aria-checked={wf.enabled} aria-label="Workflow on" disabled={saving} onClick={() => void toggleEnabled()}
              style={{ width: 40, height: 22, borderRadius: 11, border: "none", background: wf.enabled ? "#14b8a6" : "#64748b", position: "relative", cursor: "pointer", padding: 0 }}>
              <span style={{ position: "absolute", top: 3, left: wf.enabled ? 21 : 3, width: 16, height: 16, borderRadius: 8, background: "#fff", transition: "left 0.15s" }} />
            </button>
          </label>
          <button type="button" onClick={() => setPanel({ type: "issues" })} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.5)", color: "#fff", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 13 }}>
            Review issues{issues.length ? " (" + issues.length + ")" : ""}
          </button>
          <button type="button" disabled={saving} onClick={() => void save()} style={{ background: "#fff", color: NAVY, border: "none", borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>{saving ? "Saving..." : "Save"}</button>
        </div>
        <nav role="tablist" aria-label="Workflow sections" style={{ flexBasis: "100%", display: "flex", gap: 4, marginBottom: -8 }}>
          {tabBtn("actions", "Actions")}{tabBtn("settings", "Settings")}{tabBtn("performance", "Performance")}{tabBtn("history", "History")}
        </nav>
      </header>
      {message && (
        <div role={message.ok ? "status" : "alert"} data-testid="editor-message" style={{ padding: "8px 16px", fontSize: 13, background: "var(--ui-surface-strong)", color: message.ok ? "var(--ui-text)" : "var(--wf-danger)", borderBottom: "1px solid var(--ui-border)", display: "flex" }}>
          <span style={{ flex: 1 }}>{message.text}</span>
          <button type="button" style={linkBtn} onClick={() => setMessage(null)}>Dismiss</button>
        </div>
      )}
      {movingId && tab === "actions" && (
        <div role="status" style={{ padding: "8px 16px", fontSize: 13, background: "var(--ui-surface-strong)", color: "var(--ui-text)", borderBottom: "1px solid var(--ui-border)", display: "flex", gap: 8 }}>
          <span style={{ flex: 1 }}>Moving step {numbers[movingId] ?? ""}: click the + where it should go.</span>
          <button type="button" style={btn} onClick={() => setMovingId(null)}>Cancel move</button>
        </div>
      )}

      <main style={{ position: "relative", flex: 1, minHeight: 0, overflow: tab === "settings" ? "auto" : "hidden", background: "var(--ui-bg, #fff)" }}>
        {tab === "actions" && canvas("edit")}
        {tab === "settings" && <SettingsTab catalog={catalog} silo={wf.silo} settings={wf.settings} goal={wf.goal} onChange={(c) => change({ ...wf, silo: c.silo ?? wf.silo, settings: c.settings ?? wf.settings, goal: c.goal === undefined ? wf.goal : c.goal })} />}
        {tab === "performance" && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
            <PerformanceStats perf={perf} />
            <div style={{ position: "relative", flex: 1 }}>{canvas("perf")}</div>
          </div>
        )}
        {tab === "history" && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 360px", maxWidth: 560, borderRight: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)", minHeight: 0, height: "100%" }}>
              <HistoryPanel workflowId={workflowId} items={history} selected={selectedEnrollment} onSelect={setSelectedEnrollment} nodes={wf.graph.nodes} numbers={numbers} onEnrolled={loadHistory} />
            </div>
            <div style={{ position: "relative", flex: "2 1 400px", height: "100%" }}>{canvas("history")}</div>
          </div>
        )}

        {panel?.type === "insert" && (
          <InsertPanel key={panel.slot.parent + panel.slot.port} ctx={ctx} onClose={() => setPanel(null)}
            pasteLabel={clipboard ? defOf(clipboard)?.label : undefined}
            onPaste={clipboard ? () => { if (changeGraph((g) => insertAt(g, panel.slot, newId(), detachedCopy(clipboard)))) setPanel(null); } : undefined}
            onInsert={(node) => { if (changeGraph((g) => insertAt(g, panel.slot, newId(), node))) setPanel(null); }} />
        )}
        {panel?.type === "edit" && wf.graph.nodes[panel.nodeId] && (
          <StepDetails key={panel.nodeId} title={(numbers[panel.nodeId] ? numbers[panel.nodeId] + ". " : "") + (defOf(wf.graph.nodes[panel.nodeId]!)?.label ?? "Step")} initial={wf.graph.nodes[panel.nodeId]!} ctx={{ ...ctx, selfId: panel.nodeId }} onClose={() => setPanel(null)}
            onSave={(node) => { change({ ...wf, graph: { ...wf.graph, nodes: { ...wf.graph.nodes, [panel.nodeId]: node } } }); setPanel(null); }} />
        )}
        {panel?.type === "trigger" && (
          <TriggerPanel catalog={catalog} triggers={wf.graph.triggers} reenroll={wf.settings.reenroll} onClose={() => setPanel(null)}
            onSave={(triggers, reenroll) => { change({ ...wf, graph: { ...wf.graph, triggers }, settings: { ...wf.settings, reenroll } }); setPanel(null); }} />
        )}
        {panel?.type === "issues" && (
          <PanelShell testId="issues-panel" title="Review issues" onClose={() => setPanel(null)}>
            {issues.length === 0 ? <div style={{ fontSize: 14, color: "var(--ui-text)" }}>No issues found. This workflow is ready to turn on.</div> : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {issues.map((i, idx) => (
                  <li key={idx} style={{ marginBottom: 8 }}>
                    <button type="button" data-testid="issue-item" onClick={() => goToIssue(i.nodeId)} style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 10px", border: "1px solid var(--ui-border)", borderRadius: 6, background: "var(--ui-surface-strong)", color: "var(--ui-text)", cursor: "pointer", fontSize: 13 }}>
                      <strong>{i.nodeId ? (numbers[i.nodeId] ? numbers[i.nodeId] + ". " : "") + (wf.graph.nodes[i.nodeId] ? defOf(wf.graph.nodes[i.nodeId]!)?.title ?? "Step" : "Step") : "Enrollment trigger"}</strong>
                      <span style={{ display: "block", color: "var(--wf-danger)", marginTop: 2 }}>{i.message}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </PanelShell>
        )}
        {panel?.type === "delete" && deleting && (
          <PanelShell testId="delete-panel" title="Delete action" onClose={() => setPanel(null)}>
            <p style={{ fontSize: 14, color: "var(--ui-text)", marginTop: 0 }}>Delete step {numbers[panel.nodeId] ?? ""}{hasBelow ? ", or this step and everything below it?" : "?"}</p>
            {deleting.kind === "branch" || deleting.kind === "value_branch" ? <p style={muted}>Deleting only the branch step keeps the "None met" path.</p> : deleting.kind === "delay" && deleting.mode === "until_event" ? <p style={muted}>Deleting only this step keeps the "Event happened" path.</p> : null}
            <div style={{ display: "grid", gap: 8 }}>
              <button type="button" style={primary} onClick={() => { changeGraph((g) => deleteStep(g, panel.nodeId)); setPanel(null); }}>Delete this step only</button>
              {hasBelow && <button type="button" style={{ ...btn, color: "var(--wf-danger)" }} onClick={() => { changeGraph((g) => deleteBranch(g, panel.nodeId)); setPanel(null); }}>Delete this step and everything below it</button>}
              <button type="button" style={btn} onClick={() => setPanel(null)}>Cancel</button>
            </div>
          </PanelShell>
        )}
      </main>
    </div>
  );
}
