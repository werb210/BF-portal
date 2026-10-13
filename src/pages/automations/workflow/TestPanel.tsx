// BF_PORTAL_v792 - "Test this workflow": pick a contact and run the workflow for them in test mode.
// Nothing is sent or changed; each step reports what it would do. Works while the workflow is a draft.
import { useState } from "react";
import { defOf } from "./actions";
import { PanelShell } from "./SidePanel";
import { ContactSearch, type ContactHit } from "./Tabs";
import type { WorkflowNode } from "./types";
import { btn, muted, primary } from "./ui";
import { errorText, workflowApi, type TestStep } from "./workflowApi";

const DELAY_TYPES = new Set(["delay", "wait"]);
const PATH_TYPES = new Set(["branch", "value_branch", "goto", "check"]);

/** The server's step outcome as plain words. */
export function outcomeWords(step: Pick<TestStep, "outcome" | "stepType"> & { detail?: string | null }): string {
  const o = step.outcome.toLowerCase();
  const type = step.stepType.toLowerCase();
  // BF_PORTAL_v796_BUILDER_WORDING - the branch went down "None met".
  if (PATH_TYPES.has(type) && /^no (path|value) matched/i.test(String(step.detail ?? ""))) return "No path matched";
  if (o === "dry_run") return DELAY_TYPES.has(type) ? "Would wait" : "Would run";
  if (o === "waiting" || o === "timeout") return "Would wait";
  if (o === "passed") return "Took path";
  if (o === "done" || o === "resumed") return PATH_TYPES.has(type) ? "Took path" : "Would run";
  if (o === "skipped") return "Skipped";
  if (o === "failed") return "Failed";
  if (o === "stopped") return "Stopped";
  const words = o.replace(/_/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "Done";
}

export type TestResult = { contact: ContactHit; steps: TestStep[] };

export function TestPanel({ workflowId, nodes, numbers, result, onResult, onClose }: {
  workflowId: string; nodes: Record<string, WorkflowNode>; numbers: Record<string, number>;
  result: TestResult | null; onResult: (r: TestResult | null) => void; onClose: () => void;
}) {
  const [contact, setContact] = useState<ContactHit | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stepName = (s: TestStep) => {
    const node = s.nodeId ? nodes[s.nodeId] : undefined;
    if (node) return (numbers[s.nodeId!] ? numbers[s.nodeId!] + ". " : "") + (defOf(node)?.label ?? s.stepType.replace(/_/g, " "));
    const t = s.stepType.replace(/_/g, " ");
    return t ? t.charAt(0).toUpperCase() + t.slice(1) : "Step";
  };

  const run = async () => {
    if (!contact) return;
    setRunning(true); setError(null); onResult(null);
    try {
      const r = await workflowApi.testRun(workflowId, contact.id);
      const steps = r.steps ?? (r.enrollmentId ? await workflowApi.enrollmentLog(r.enrollmentId) : []);
      onResult({ contact, steps });
    } catch (e) {
      setError(errorText(e, "Could not run the test."));
    } finally { setRunning(false); }
  };

  return (
    <PanelShell testId="test-panel" title="Test this workflow" onClose={onClose}>
      <p style={{ ...muted, fontSize: 13, marginTop: 0 }}>Pick a contact to see what each step would do for them. Nothing is sent or changed.</p>
      {contact ? (
        <div data-testid="test-contact" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, fontSize: 13, color: "var(--ui-text)" }}>
          <span style={{ flex: 1 }}>Contact: <strong>{contact.name}</strong>{contact.email ? <span style={muted}> - {contact.email}</span> : null}</span>
          <button type="button" style={btn} disabled={running} onClick={() => { setContact(null); onResult(null); }}>Change</button>
        </div>
      ) : (
        <div style={{ border: "1px solid var(--ui-border)", borderRadius: 8, padding: 10, marginBottom: 10 }}>
          <ContactSearch onPick={setContact} />
        </div>
      )}
      <button type="button" style={primary} disabled={!contact || running} onClick={() => void run()}>
        {running ? "Running test..." : result ? "Run test again" : "Run test"}
      </button>
      {error && <div role="alert" style={{ color: "var(--wf-danger)", fontSize: 13, marginTop: 8 }}>{error}</div>}
      {result && (
        <div data-testid="test-result" style={{ marginTop: 14, color: "var(--ui-text)" }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Test run for {result.contact.name} - nothing was sent or changed.</div>
          {result.steps.length === 0 ? <div style={muted}>No steps ran.</div> : (
            <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13 }}>
              {result.steps.map((s, i) => (
                <li key={i} data-testid="test-step" style={{ marginBottom: 6 }}>
                  <strong>{stepName(s)}</strong>
                  <span style={{ marginLeft: 6, padding: "1px 6px", borderRadius: 8, border: "1px solid var(--ui-border)", color: s.outcome === "failed" ? "var(--wf-danger)" : "var(--ui-text)" }}>{outcomeWords(s)}</span>
                  {s.detail ? <div style={{ color: "var(--ui-text-muted)", marginTop: 2 }}>{s.detail}</div> : null}
                </li>
              ))}
            </ol>
          )}
          <p style={{ ...muted, marginTop: 10 }}>To try another contact, click Change and pick someone else.</p>
        </div>
      )}
    </PanelShell>
  );
}
