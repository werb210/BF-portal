// BF_PORTAL_SEQUENCE_CANVAS_v1 — one visual sequence model for both marketing silos.
import { useMemo, useState } from "react";

export type SequenceSilo = "bf" | "bi";
export type SequenceTemplate = { id: string; name: string; channel?: string; body?: string | null };
export type SequenceQueue = { id: string; name: string };
type SendKind = "email" | "sms" | "auto" | "task";
type WaitUnit = "minutes" | "hours" | "days";

export type SequenceNode = {
  id: string;
  kind: SendKind | "wait";
  templateId?: string;
  body?: string;
  condition?: string;
  waitValue?: number;
  waitUnit?: WaitUnit;
  taskType?: string;
  taskTitle?: string;
  taskPriority?: string;
  taskQueueId?: string;
  taskNotes?: string;
  taskPause?: boolean;
};

export type BFSequenceStep = Record<string, unknown>;
export type BISequenceStep = Record<string, unknown>;

const minutes = (node: SequenceNode) => (Number(node.waitValue) || 0) * (node.waitUnit === "days" ? 1440 : node.waitUnit === "hours" ? 60 : 1);

/** The sole adapter between the canvas node model and backend wire formats. */
export function serializeNodes(nodes: SequenceNode[], silo: SequenceSilo): (BFSequenceStep | BISequenceStep)[] {
  let pendingMinutes = 0;
  const steps: (BFSequenceStep | BISequenceStep)[] = [];
  for (const node of nodes) {
    if (node.kind === "wait") {
      pendingMinutes += minutes(node); // consecutive waits intentionally accumulate
      continue;
    }
    const task = node.kind === "task";
    const taskFields = task ? {
      subject: node.taskTitle?.trim(), body: node.taskNotes?.trim() || null,
      taskType: node.taskType || "TODO", taskPriority: node.taskPriority || "NONE",
      taskQueueId: node.taskQueueId || null, taskPause: node.taskPause ?? true,
    } : {};
    if (silo === "bi") {
      steps.push({
        type: task ? "task" : "email", position: steps.length,
        delay_seconds: pendingMinutes * 60,
        conditions: { rule: node.condition || "always" },
        template_id: task ? null : node.templateId || null,
        ...taskFields,
      });
    } else {
      steps.push({
        channel: node.kind, wait_minutes: pendingMinutes,
        condition: node.condition || "always",
        template_id: task ? null : node.templateId || null,
        ...taskFields,
      });
    }
    pendingMinutes = 0;
  }
  return steps;
}

const issueFor = (node: SequenceNode): string | null => {
  if (node.kind === "wait") return minutes(node) > 0 ? null : "Set a delay";
  if (node.kind === "task") return node.taskTitle?.trim() ? null : "Task needs a title";
  if (node.templateId) return null;
  return node.body?.trim() ? null : "Pick a template or add a message body";
};

const labels: Record<SequenceNode["kind"], string> = { email: "Email", sms: "SMS", auto: "Auto", task: "Task", wait: "Wait" };
const newNode = (kind: SequenceNode["kind"]): SequenceNode => ({
  id: `${kind}-${Date.now()}-${Math.random().toString(36).slice(2)}`, kind,
  condition: "always", waitValue: kind === "wait" ? 1 : undefined,
  waitUnit: "days", taskType: "TODO", taskPriority: "NONE", taskPause: true,
});

type Props = {
  silo: SequenceSilo;
  templates?: SequenceTemplate[];
  queues?: SequenceQueue[];
  busy?: boolean;
  onSave: (steps: (BFSequenceStep | BISequenceStep)[]) => void | Promise<void>;
};

export default function SequenceCanvas({ silo, templates = [], queues = [], busy = false, onSave }: Props) {
  const [nodes, setNodes] = useState<SequenceNode[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const selected = nodes.find((node) => node.id === selectedId) ?? null;
  const issues = useMemo(() => nodes.map(issueFor), [nodes]);
  const palette: SequenceNode["kind"][] = silo === "bi" ? ["email", "wait", "task"] : ["email", "sms", "auto", "wait", "task"];
  const patch = (id: string, value: Partial<SequenceNode>) => setNodes((all) => all.map((node) => node.id === id ? { ...node, ...value } : node));
  const add = (kind: SequenceNode["kind"]) => { const node = newNode(kind); setNodes((all) => [...all, node]); setSelectedId(node.id); };
  const moveBefore = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    // BF_PORTAL_SEQUENCE_CANVAS_REORDER_v1 - the immutable splice method is ES2023
    // and this project targets ES2022, so tsc rejected it and CI went red.
    // splice on a copy does the same job on every runtime we support.
    setNodes((all) => {
      const moving = all.find((n) => n.id === dragId);
      if (!moving) return all;
      const rest = all.filter((n) => n.id !== dragId);
      const at = rest.findIndex((n) => n.id === targetId);
      const next = [...rest];
      next.splice(at < 0 ? next.length : at, 0, moving);
      return next;
    });
    setDragId(null);
  };
  const input = "block w-full rounded border px-2 py-1 mt-1 bg-transparent";

  return <div className="grid gap-4 lg:grid-cols-[180px_minmax(260px,1fr)_320px]" data-silo={silo}>
    <aside className="drawer-section"><h3 className="drawer-section__title mb-3">Add a step</h3><div className="grid gap-2">
      {palette.map((kind) => <button key={kind} type="button" className="ui-button ui-button--secondary justify-start" onClick={() => add(kind)}>+ {labels[kind]}</button>)}
    </div></aside>
    <section className="drawer-section"><h3 className="drawer-section__title mb-3">Sequence flow</h3>
      {!nodes.length && <p className="text-sm opacity-70">Choose a step from the palette to begin.</p>}
      <div className="space-y-2">{nodes.map((node, index) => <button key={node.id} type="button" draggable
        onDragStart={() => setDragId(node.id)} onDragOver={(e) => e.preventDefault()} onDrop={() => moveBefore(node.id)}
        onClick={() => setSelectedId(node.id)} className={`w-full rounded border p-3 text-left ${selectedId === node.id ? "ring-2 ring-blue-500" : ""}`}>
        <span className="font-semibold">⋮⋮ {index + 1}. {labels[node.kind]}</span>
        {node.kind === "wait" && <span className="ml-2 text-sm opacity-70">{node.waitValue || 0} {node.waitUnit}</span>}
        {issues[index] && <span className="block text-xs text-red-500 mt-1">{issues[index]}</span>}
      </button>)}</div>
      <button type="button" className="ui-button ui-button--primary mt-4" disabled={busy || !nodes.length || issues.some(Boolean)} onClick={() => void onSave(serializeNodes(nodes, silo))}>{busy ? "Saving..." : "Save sequence"}</button>
    </section>
    <aside className="drawer-section"><h3 className="drawer-section__title mb-3">Step inspector</h3>
      {!selected && <p className="text-sm opacity-70">Select a step to configure it.</p>}
      {selected && <div className="space-y-3">
        {selected.kind === "wait" ? <><label className="text-sm">Delay<input aria-label="Delay" type="number" min={1} value={selected.waitValue ?? 0} onChange={(e) => patch(selected.id, { waitValue: Number(e.target.value) })} className={input} /></label><select aria-label="Delay unit" value={selected.waitUnit} onChange={(e) => patch(selected.id, { waitUnit: e.target.value as WaitUnit })} className={input}><option value="minutes">Minutes</option><option value="hours">Hours</option><option value="days">Days</option></select></> : selected.kind === "task" ? <>
          <label className="text-sm">Task type<select value={selected.taskType} onChange={(e) => patch(selected.id, { taskType: e.target.value })} className={input}>{["CALL", "EMAIL", "SMS", "TODO"].map((v) => <option key={v}>{v}</option>)}</select></label>
          <label className="text-sm">Priority<select value={selected.taskPriority} onChange={(e) => patch(selected.id, { taskPriority: e.target.value })} className={input}>{["NONE", "LOW", "MEDIUM", "HIGH"].map((v) => <option key={v}>{v}</option>)}</select></label>
          <label className="text-sm">Queue<select value={selected.taskQueueId || ""} onChange={(e) => patch(selected.id, { taskQueueId: e.target.value })} className={input}><option value="">No queue</option>{queues.map((q) => <option key={q.id} value={q.id}>{q.name}</option>)}</select></label>
          <label className="text-sm">Task title<input value={selected.taskTitle || ""} onChange={(e) => patch(selected.id, { taskTitle: e.target.value })} className={input} /></label>
          <label className="text-sm">Notes<textarea value={selected.taskNotes || ""} onChange={(e) => patch(selected.id, { taskNotes: e.target.value })} className={input} /></label>
          <label className="flex gap-2 text-sm"><input type="checkbox" checked={selected.taskPause ?? true} onChange={(e) => patch(selected.id, { taskPause: e.target.checked })} />Pause sequence until this task is completed</label>
        </> : <>
          <label className="text-sm">Template<select value={selected.templateId || ""} onChange={(e) => patch(selected.id, { templateId: e.target.value })} className={input}><option value="">Select a template</option>{templates.filter((t) => selected.kind === "auto" || !t.channel || t.channel === selected.kind).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
          <label className="text-sm">Message body<textarea value={selected.body || ""} onChange={(e) => patch(selected.id, { body: e.target.value })} className={input} /></label>
          <label className="text-sm">Send if<select value={selected.condition} onChange={(e) => patch(selected.id, { condition: e.target.value })} className={input}><option value="always">Always</option><option value="if_no_open">No open yet</option><option value="if_no_click">No click yet</option><option value="if_no_reply">No reply yet</option></select></label>
        </>}
        <button type="button" className="ui-button ui-button--secondary" onClick={() => { setNodes((all) => all.filter((n) => n.id !== selected.id)); setSelectedId(null); }}>Remove step</button>
      </div>}
    </aside>
  </div>;
}
