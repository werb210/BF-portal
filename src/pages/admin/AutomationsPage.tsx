// BF_PORTAL_AUTOMATION_BUILDER_v680 - the list of automations over BF-Server's engine.
// BF_PORTAL_v786_WORKFLOW_BUILDER - the form editor is replaced by the full-screen workflow
// editor at /automations/:id; this page lists workflows (on / off, edit, delete) and creates
// them from scratch, from a template or with AI.
import { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import SiloContext from "@/context/SiloContext";
import CreateWorkflowMenu from "@/pages/automations/workflow/CreateWorkflowMenu";
import { triggerSummary } from "@/pages/automations/workflow/graph";
import type { Catalog, Workflow } from "@/pages/automations/workflow/types";
import { btn, muted } from "@/pages/automations/workflow/ui";
import { errorText, toSilo, workflowApi } from "@/pages/automations/workflow/workflowApi";

const card: React.CSSProperties = { border: "1px solid var(--ui-border)", borderRadius: 8, padding: 16, marginBottom: 12, background: "var(--ui-surface-strong)", color: "var(--ui-text)" };

/** One line: what starts the workflow and how many steps it has. */
export function describeWorkflow(w: Workflow, catalog: Catalog | null): string {
  const steps = Object.keys(w.graph.nodes).length;
  return "When " + triggerSummary(w.graph.triggers, catalog).replace(/^Choose what starts this workflow$/, "(no trigger yet)") + " - " + steps + (steps === 1 ? " step" : " steps");
}

export default function AutomationsPage(): JSX.Element {
  const navigate = useNavigate();
  const siloCtx = useContext(SiloContext);
  const silo = toSilo((siloCtx as { silo?: string } | null)?.silo); // BF_PORTAL_v787_BUILDER_FIXES - BF, BI or SLF
  const [cat, setCat] = useState<Catalog | null>(null);
  const [rules, setRules] = useState<Workflow[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const load = () => void workflowApi.list().then(setRules).catch(() => setRules([]));
  useEffect(() => {
    void workflowApi.catalog().then(setCat).catch(() => setCat(null));
    load();
  }, []);
  const sorted = useMemo(() => [...(rules ?? [])].sort((a, b) => Number(b.enabled) - Number(a.enabled) || a.name.localeCompare(b.name)), [rules]);
  const toggle = (r: Workflow) => {
    if (!r.id) return;
    setMsg(null);
    void workflowApi.update(r.id, { enabled: !r.enabled }).then(load).catch((e) => setMsg(errorText(e, "Could not turn it " + (r.enabled ? "off" : "on") + ". Open it and use Review issues.")));
  };
  const del = (r: Workflow) => { if (r.id && window.confirm('Delete "' + r.name + '"?')) void workflowApi.remove(r.id).then(load).catch(() => setMsg("Could not delete it.")); };

  return (
    <div style={{ padding: 24, maxWidth: 900, color: "var(--ui-text)" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
        <h1 style={{ fontSize: 20, margin: 0 }}>Automations</h1>
        <span style={{ marginLeft: "auto" }}><CreateWorkflowMenu silo={silo} /></span>
      </div>
      <p style={{ ...muted, fontSize: 13, marginBottom: 16 }}>Workflows run steps automatically when something happens - a new lead, a stage change, a missed call, an email opened.</p>
      {msg && <div role="alert" style={{ color: "var(--wf-danger, #b91c1c)", fontSize: 13, marginBottom: 12 }}>{msg}</div>}
      {rules === null && <div style={muted}>Loading{"..."}</div>}
      {rules?.length === 0 && <div style={card}>No automations yet.</div>}
      {sorted.map((r) => (
        <div key={r.id} style={{ ...card, opacity: r.enabled ? 1 : 0.85 }} data-testid="automation-rule">
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <b>{r.name}</b>
            <span style={{ ...muted, padding: "1px 8px", borderRadius: 10, border: "1px solid var(--ui-border)" }}>{r.enabled ? "On" : "Off"}{r.settings.testMode ? " - test mode" : ""}</span>
            <span style={muted}>{r.silo}</span>
            <span style={muted}>{r.active_count ?? 0} running - {r.total_count ?? 0} total</span>
            <span style={{ marginLeft: "auto", display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button type="button" style={btn} onClick={() => toggle(r)}>{r.enabled ? "Turn off" : "Turn on"}</button>
              <button type="button" style={btn} onClick={() => r.id && navigate("/automations/" + encodeURIComponent(r.id))}>Edit</button>
              <button type="button" style={btn} onClick={() => del(r)}>Delete</button>
            </span>
          </div>
          <div style={{ ...muted, fontSize: 13, marginTop: 6 }}>{describeWorkflow(r, cat)}</div>
        </div>))}
    </div>);
}
