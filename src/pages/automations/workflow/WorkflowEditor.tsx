// BF_PORTAL_v786_WORKFLOW_BUILDER - full-screen HubSpot-style workflow editor at
// /automations/:id (and /automations/new). Dark header bar with the editable name, On/Off,
// Save and Review issues; tabs Actions | Settings | Performance | History.
// BF_PORTAL_v787_BUILDER_FIXES - Admin and Marketing edit; Staff open it read-only. New workflows
// take the topbar silo. Server errors {error: {code}, issues} show as readable text, and trigger
// issues ("trigger:<i>") are listed and mark the trigger card.
// BF_PORTAL_v792 - build, test, then turn on: a Test button (anyone who can enroll) runs the
// workflow for one contact in test mode, even while it is a draft; visited steps are outlined.
// While off the status reads "Draft".
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AuthContext } from "@/auth/AuthContext";
import SiloContext from "@/context/SiloContext";
import { resolveUserRole } from "@/utils/roles";
import "./workflow.css";
import { defOf } from "./actions";
import type { FormContext } from "./DetailForms";
import { GraphError, cloneAfter, deleteBranch, deleteStep, detachedCopy, exitsOf, insertAt, missingParams, moveNode, numberNodes, triggerIssues } from "./graph";
import { newId } from "./actions";
import { InsertPanel, PanelShell, StepDetails, TriggerPanel } from "./SidePanel";
import { HistoryPanel, PerformanceStats, SettingsTab } from "./Tabs";
import { TestPanel, type TestResult } from "./TestPanel";
import type { Catalog, Issue, ListRef, Silo, Slot, UserRef, Workflow, WorkflowNode, WorkflowRef } from "./types";
import { emptyWorkflow } from "./types";
import { Icon, NAVY, btn, linkBtn, muted, primary } from "./ui";
import WorkflowCanvas from "./WorkflowCanvas";
import { errorIssues, errorText, toSilo, workflowApi, type Enrollment, type Performance } from "./workflowApi";

type Tab = "actions" | "settings" | "performance" | "history";
type Panel = null | { type: "test" } | { type: "insert"; slot: Slot } | { type: "edit"; nodeId: string } | { type: "trigger" } | { type: "issues" } | { type: "delete"; nodeId: string };

const EMPTY_CATALOG: Catalog = { triggers: [], actions: [], fields: [], operators: ["eq", "neq", "contains", "is_set", "is_not_set"], templates: { email: [], sms: [] }, stages: [], events: [], tokens: [] };

/** Problems the editor can see without asking the server (missing params, no trigger). */
export function localIssues(wf: Workflow): Issue[] {
  const out: Issue[] = [];
  if (wf.graph.triggers.length === 0) out.push({ nodeId: null, message: "Choose at least one enrollment trigger." });
  out.push(...triggerIssues(wf.graph.triggers));
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

const isTriggerIssue = (nodeId: string | null) => !!nodeId && nodeId.startsWith("trigger:");
const EDIT_ROLES = new Set(["Admin", "Marketing"]);
// Manual enroll (and so test runs) is open to Admin, Marketing and Staff (BF-Server "enrollers").
const ENROLL_ROLES = new Set(["Admin", "Marketing", "Staff"]);
const NO_PERF: Performance = { enrolled: 0, active: 0, completed: 0, goalReached: 0, byNode: {} };
const FORBIDDEN = "Only admins and marketing can change workflows.";

/** Admin and Marketing edit (BF-Server v787); everyone else who can open the editor views it. */
function useCanEdit(): boolean {
  const auth = useContext(AuthContext);
  if (!auth) return true; // no auth provider (embedded/tests): the server still enforces roles
  const role = resolveUserRole((auth.user as { role?: string | null } | null)?.role ?? auth.role ?? null);
  return !!role && EDIT_ROLES.has(role);
}

/** Admin, Marketing and Staff may enroll a contact by hand, which includes a test run. */
function useCanEnroll(): boolean {
  const auth = useContext(AuthContext);
  if (!auth) return true;
  const role = resolveUserRole((auth.user as { role?: string | null } | null)?.role ?? auth.role ?? null);
  return !!role && ENROLL_ROLES.has(role);
}

/** The silo selected in the top bar (BF when none / admin). */
function useTopbarSilo(fallback: string | null): Silo {
  const ctx = useContext(SiloContext);
  return toSilo(ctx?.silo ?? fallback);
}

export default function WorkflowEditor() {
  const { id: routeId = "new" } = useParams();
  const [search] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const canEdit = useCanEdit();
  const canEnroll = useCanEnroll();
  const topbarSilo = useTopbarSilo(search.get("silo"));
  const isNew = routeId === "new";
  const [wf, setWf] = useState<Workflow | null>(isNew ? emptyWorkflow(topbarSilo) : null);
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
  // Issues handed over by the With AI flow (a 422 draft) stay listed until the next save.
  const [draftIssues] = useState<Issue[]>(() => {
    const fromState = (location.state as { issues?: Issue[] } | null)?.issues;
    return Array.isArray(fromState) ? fromState : [];
  });
  const [serverIssues, setServerIssues] = useState<Issue[]>(draftIssues);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [clipboard, setClipboard] = useState<WorkflowNode | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [perf, setPerf] = useState<Performance | null>(null);
  const [history, setHistory] = useState<Enrollment[] | null>(null);
  const [selectedEnrollment, setSelectedEnrollment] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
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
    workflowApi.validate(workflowId).then((i) => { if (!cancelled) setServerIssues(mergeIssues(draftIssues, i)); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [workflowId, draftIssues]);

  const loadHistory = useCallback(() => {
    if (!workflowId) { setHistory([]); return; }
    workflowApi.history(workflowId).then(setHistory).catch(() => setHistory([]));
  }, [workflowId]);

  useEffect(() => {
    if (tab === "performance") {
      if (!workflowId) setPerf(NO_PERF);
      else workflowApi.performance(workflowId).then(setPerf).catch(() => setPerf(NO_PERF));
    }
    if (tab === "history") loadHistory();
  }, [tab, workflowId, loadHistory]);

  const numbers = useMemo(() => (wf ? numberNodes(wf.graph) : {}), [wf]);
  const issues = useMemo(() => (wf ? mergeIssues(localIssues(wf), serverIssues.filter((i) => !i.nodeId || wf.graph.nodes[i.nodeId] || isTriggerIssue(i.nodeId))) : []), [wf, serverIssues]);
  const issuesByNode = useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const i of serverIssues) if (i.nodeId) (out[i.nodeId] ??= []).push(i.message);
    return out;
  }, [serverIssues]);
  const triggerProblems = useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const i of issues) if (isTriggerIssue(i.nodeId)) (out[i.nodeId!] ??= []).push(i.message);
    return out;
  }, [issues]);
  const highlight = useMemo(() => {
    const e = history?.find((x) => x.id === selectedEnrollment);
    if (!e) return null;
    const ids = e.path.map((s) => s.nodeId).filter((x): x is string => !!x);
    return new Set([...ids, ...(e.currentNodeId ? [e.currentNodeId] : [])]);
  }, [history, selectedEnrollment]);

  const testVisited = panel?.type === "test" && testResult ? new Set(testResult.steps.map((s) => s.nodeId).filter((x): x is string => !!x)) : null;

  if (loadError) return <div style={{ padding: 24, color: "var(--wf-danger)" }}>{loadError}</div>;
  if (!wf) return <div style={{ padding: 24, color: "var(--ui-text)" }}>Loading workflow...</div>;

  const change = (next: Workflow) => { if (!canEdit) return; setWf(next); setDirty(true); };
  const changeGraph = (fn: (g: Workflow["graph"]) => Workflow["graph"]) => {
    try { change({ ...wf, graph: fn(wf.graph) }); return true; }
    catch (e) { setMessage({ ok: false, text: e instanceof GraphError ? e.message : "That change could not be made." }); return false; }
  };

  const ctx: FormContext = { catalog, users, lists, workflows, nodes: wf.graph.nodes, numbers, workflowId };

  async function save(next: Workflow = wf!): Promise<Workflow | null> {
    if (!canEdit) return null;
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
      const found = errorIssues(e);
      if (found.length) setServerIssues(found);
      setMessage({ ok: false, text: errorText(e, "Could not save this workflow.", FORBIDDEN) });
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
      setMessage({ ok: false, text: "Fix these before turning it on: " + found.length + (found.length === 1 ? " issue" : " issues") + ". You can keep building and testing while it's a draft." });
      return;
    }
    await save({ ...saved, enabled: true });
  }

  async function openTest() {
    setMessage(null);
    if (!wf!.graph.startNodeId && Object.keys(wf!.graph.nodes).length === 0) {
      setMessage({ ok: true, text: "Add at least one step to test." });
      return;
    }
    let current: Workflow | null = wf!;
    if (dirty || !current.id) current = await save(current);
    if (!current?.id) return;
    setTab("actions"); setMovingId(null); setTestResult(null);
    setPanel({ type: "test" });
  }
  const closePanel = () => { setPanel(null); setTestResult(null); };

  const onPlus = (slot: Slot) => {
    if (movingId) {
      if (changeGraph((g) => moveNode(g, movingId, slot))) setMessage(null);
      setMovingId(null);
      return;
    }
    setPanel({ type: "insert", slot });
  };

  const flash = (id: string) => {
    setFlashId(id);
    window.setTimeout(() => setFlashId((cur) => (cur === id ? null : cur)), 2500);
  };
  const goToIssue = (nodeId: string | null) => {
    setTab("actions");
    if (!nodeId || isTriggerIssue(nodeId)) {
      flash("trigger");
      setPanel(canEdit ? { type: "trigger" } : null);
      return;
    }
    setPanel(null);
    flash(nodeId);
  };
  const issueTitle = (nodeId: string | null) => {
    if (!nodeId) return "Workflow";
    if (isTriggerIssue(nodeId)) {
      const i = Number(nodeId.slice("trigger:".length));
      const t = wf.graph.triggers[i];
      return "Enrollment trigger" + (wf.graph.triggers.length > 1 ? " " + (i + 1) : "") + (t ? ": " + (catalog.triggers.find((x) => x.type === t.type)?.label ?? t.type) : "");
    }
    return (numbers[nodeId] ? numbers[nodeId] + ". " : "") + (wf.graph.nodes[nodeId] ? defOf(wf.graph.nodes[nodeId]!)?.title ?? "Step" : "Step");
  };
  const allTriggerProblems = Object.values(triggerProblems).flat();
  const editMode = canEdit ? "edit" : "view";

  const canvas = (mode: "edit" | "view" | "perf" | "history") => (
    <WorkflowCanvas
      graph={wf.graph}
      catalog={catalog}
      reenroll={wf.settings.reenroll}
      ctx={{ users, lists, workflows }}
      numbers={numbers}
      issues={issuesByNode}
      triggerIssues={allTriggerProblems}
      counts={mode === "perf" ? perf?.byNode ?? {} : null}
      highlight={mode === "history" ? highlight : null}
      visited={mode === "edit" || mode === "view" ? testVisited : null}
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
        {editingName && canEdit ? (
          <input aria-label="Workflow name" autoFocus value={wf.name} onChange={(e) => change({ ...wf, name: e.target.value })} onBlur={() => setEditingName(false)} onKeyDown={(e) => { if (e.key === "Enter") setEditingName(false); }}
            style={{ fontSize: 16, fontWeight: 700, padding: "4px 8px", borderRadius: 6, border: "1px solid #94a3b8", background: "#fff", color: NAVY, minWidth: 220 }} />
        ) : (
          canEdit ? (
            <button type="button" aria-label="Edit workflow name" onClick={() => setEditingName(true)} style={{ background: "transparent", border: "none", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, padding: 0 }}>
              <span data-testid="workflow-name">{wf.name}</span> <Icon.pencil />
            </button>
          ) : <span data-testid="workflow-name" style={{ fontSize: 16, fontWeight: 700 }}>{wf.name}</span>
        )}
        <span data-testid="header-silo" style={{ fontSize: 12, padding: "2px 8px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.5)" }}>{wf.silo}{wf.settings.testMode ? " - test mode" : ""}</span>
        {!canEdit && <span data-testid="read-only-badge" style={{ fontSize: 12, padding: "2px 8px", borderRadius: 10, background: "#fff", color: NAVY, fontWeight: 700 }}>View only</span>}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {dirty && <span style={{ fontSize: 12, color: "#e2e8f0" }}>Unsaved changes</span>}
          {canEdit ? <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
            <span data-testid="workflow-status">{wf.enabled ? "On" : "Draft"}</span>
            <button type="button" role="switch" aria-checked={wf.enabled} aria-label="Workflow on" disabled={saving} onClick={() => void toggleEnabled()}
              style={{ width: 40, height: 22, borderRadius: 11, border: "none", background: wf.enabled ? "#14b8a6" : "#64748b", position: "relative", cursor: "pointer", padding: 0 }}>
              <span style={{ position: "absolute", top: 3, left: wf.enabled ? 21 : 3, width: 16, height: 16, borderRadius: 8, background: "#fff", transition: "left 0.15s" }} />
            </button>
          </label> : <span data-testid="workflow-status" style={{ fontSize: 13 }}>{wf.enabled ? "On" : "Draft"}</span>}
          <button type="button" onClick={() => setPanel({ type: "issues" })} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.5)", color: "#fff", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 13 }}>
            Review issues{issues.length ? " (" + issues.length + ")" : ""}
          </button>
          {canEnroll && <button type="button" disabled={saving} onClick={() => void openTest()} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.5)", color: "#fff", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Test</button>}
          {canEdit && <button type="button" disabled={saving} onClick={() => void save()} style={{ background: "#fff", color: NAVY, border: "none", borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>{saving ? "Saving..." : "Save"}</button>}
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
        {tab === "actions" && canvas(editMode)}
        {tab === "settings" && <SettingsTab readOnly={!canEdit} catalog={catalog} silo={wf.silo} settings={wf.settings} goal={wf.goal} onChange={(c) => change({ ...wf, settings: c.settings ?? wf.settings, goal: c.goal === undefined ? wf.goal : c.goal })} />}
        {tab === "performance" && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
            <PerformanceStats perf={perf} />
            <div style={{ position: "relative", flex: 1 }}>{canvas("perf")}</div>
          </div>
        )}
        {tab === "history" && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 360px", maxWidth: 560, borderRight: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)", minHeight: 0, height: "100%" }}>
              <HistoryPanel canEnroll={canEnroll} workflowId={workflowId} items={history} selected={selectedEnrollment} onSelect={setSelectedEnrollment} nodes={wf.graph.nodes} numbers={numbers} onEnrolled={loadHistory} />
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
          <TriggerPanel catalog={catalog} triggers={wf.graph.triggers} reenroll={wf.settings.reenroll} issues={triggerProblems} onClose={() => setPanel(null)}
            onSave={(triggers, reenroll) => { change({ ...wf, graph: { ...wf.graph, triggers }, settings: { ...wf.settings, reenroll } }); setPanel(null); }} />
        )}
        {panel?.type === "issues" && (
          <PanelShell testId="issues-panel" title="Review issues" onClose={() => setPanel(null)}>
            {issues.length === 0 ? <div style={{ fontSize: 14, color: "var(--ui-text)" }}>No issues found. This workflow is ready to turn on.</div> : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {issues.map((i, idx) => (
                  <li key={idx} style={{ marginBottom: 8 }}>
                    <button type="button" data-testid="issue-item" onClick={() => goToIssue(i.nodeId)} style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 10px", border: "1px solid var(--ui-border)", borderRadius: 6, background: "var(--ui-surface-strong)", color: "var(--ui-text)", cursor: "pointer", fontSize: 13 }}>
                      <strong>{issueTitle(i.nodeId)}</strong>
                      <span style={{ display: "block", color: "var(--wf-danger)", marginTop: 2 }}>{i.message}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </PanelShell>
        )}
        {panel?.type === "test" && wf.id && (
          <TestPanel workflowId={wf.id} nodes={wf.graph.nodes} numbers={numbers} result={testResult} onResult={setTestResult} onClose={closePanel} />
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
