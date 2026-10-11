// BF_PORTAL_v786_WORKFLOW_BUILDER - the Actions canvas: the graph laid out top-down (trigger
// card, numbered step cards, a "+" on every connector, branch labels, end markers) on React
// Flow, with zoom, fit, pan and a minimap. Cards can be dragged onto a "+" to move them.
import { createContext, useContext, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Background, Controls, Handle, MiniMap, Position, ReactFlow, applyNodeChanges, type Edge, type Node, type NodeChange, type NodeProps, type ReactFlowInstance } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./workflow.css";
import { CATEGORY_COLOR, defOf, type Category } from "./actions";
import { CARD_H, CARD_W, END_H, END_W, LABEL_H, LABEL_W, PLUS, TRIGGER_H, TRIGGER_W, layoutGraph, missingParams, summarize, triggerSummary, type LayoutItem, type SummaryContext } from "./graph";
import type { Catalog, Graph, Reenroll, Slot } from "./types";
import { Icon, NAVY, iconBtn, linkBtn, muted } from "./ui";

export type CanvasProps = {
  graph: Graph;
  catalog: Catalog;
  reenroll: Reenroll;
  ctx: Omit<SummaryContext, "numbers" | "nodes" | "catalog">;
  numbers: Record<string, number>;
  issues: Record<string, string[]>;
  counts?: Record<string, number> | null;
  highlight?: Set<string> | null;
  flashId?: string | null;
  movingId?: string | null;
  readOnly?: boolean;
  onPlus: (slot: Slot) => void;
  onOpenNode: (id: string) => void;
  onTrigger: () => void;
  onCopy: (id: string) => void;
  onMove: (id: string) => void;
  onClone: (id: string) => void;
  onDelete: (id: string) => void;
  onDropNode: (id: string, slot: Slot) => void;
};

type CardData = { kind: "step"; nodeId: string } | { kind: "trigger" } | { kind: "plus"; slot: Slot } | { kind: "label"; label: string } | { kind: "end" };

const ICON: Record<Category, () => JSX.Element> = { delay: Icon.clock, workflow: Icon.branch, internal: Icon.bell, external: Icon.mail, assignment: Icon.user, create: Icon.task, edit: Icon.edit, list: Icon.list };
const SIZE: Record<LayoutItem["type"], [number, number]> = { trigger: [TRIGGER_W, TRIGGER_H], step: [CARD_W, CARD_H], plus: [PLUS, PLUS], label: [LABEL_W, LABEL_H], end: [END_W, END_H] };
const hidden: CSSProperties = { opacity: 0, width: 1, height: 1, minWidth: 0, minHeight: 0, border: "none", background: "transparent" };

function toNodes(items: LayoutItem[], movingId: string | null | undefined, readOnly: boolean): Node<CardData>[] {
  return items.map((item) => {
    const [w, h] = SIZE[item.type];
    const data: CardData = item.type === "step" ? { kind: "step", nodeId: item.nodeId } : item.type === "plus" ? { kind: "plus", slot: item.slot } : item.type === "label" ? { kind: "label", label: item.label } : { kind: item.type };
    return { id: item.id, type: item.type, position: { x: item.x - w / 2, y: item.y }, width: w, height: h, data, draggable: item.type === "step" && !readOnly && !movingId, selectable: false, connectable: false };
  });
}

export default function WorkflowCanvas(props: CanvasProps) {
  const { graph, readOnly = false, movingId, flashId } = props;
  const layout = useMemo(() => layoutGraph(graph), [graph]);
  const [nodes, setNodes] = useState<Node<CardData>[]>(() => toNodes(layout.items, movingId, readOnly));
  useEffect(() => { setNodes(toNodes(layout.items, movingId, readOnly)); }, [layout, movingId, readOnly]);
  const edges = useMemo<Edge[]>(() => layout.edges.map((e) => ({ id: e.id, source: e.source, target: e.target, type: "smoothstep", selectable: false, style: { stroke: "var(--wf-edge)", strokeWidth: 1.5 } })), [layout]);
  const flow = useRef<ReactFlowInstance<Node<CardData>, Edge> | null>(null);

  // Review issues: scroll to the card that needs changes.
  useEffect(() => {
    if (!flashId || !flow.current) return;
    const item = layout.items.find((i) => i.type === "step" && i.nodeId === flashId);
    if (item) void flow.current.setCenter(item.x, item.y + CARD_H / 2, { zoom: 1, duration: 300 });
  }, [flashId, layout]);


  const onDragStop = (_: unknown, node: Node<CardData>) => {
    if (node.data.kind !== "step") return;
    const cx = node.position.x + CARD_W / 2, cy = node.position.y + CARD_H / 2;
    let best: { slot: Slot; d: number } | null = null;
    for (const item of layout.items) {
      if (item.type !== "plus" || item.slot.parent === node.data.nodeId) continue;
      const d = Math.hypot(item.x - cx, item.y + PLUS / 2 - cy);
      if (d < 140 && (!best || d < best.d)) best = { slot: item.slot, d };
    }
    if (best) props.onDropNode(node.data.nodeId, best.slot);
    setNodes(toNodes(layout.items, movingId, readOnly));
  };

  return (
    <CanvasContext.Provider value={props}>
    <div className="wf-canvas" data-testid="workflow-canvas" style={{ position: "absolute", inset: 0, background: "var(--wf-canvas)" }}>
      <ReactFlow<Node<CardData>, Edge>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={(changes: NodeChange<Node<CardData>>[]) => setNodes((ns) => applyNodeChanges(changes, ns))}
        onNodeDragStop={onDragStop}
        onInit={(instance) => { flow.current = instance; }}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
        minZoom={0.2}
        maxZoom={1.5}
        nodesConnectable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} color="var(--wf-edge)" />
        <Controls position="bottom-left" showInteractive={false} />
        <MiniMap position="bottom-right" pannable zoomable nodeColor={(n) => (n.type === "step" ? NAVY : "#94a3b8")} ariaLabel="Workflow minimap" />
      </ReactFlow>
    </div>
    </CanvasContext.Provider>
  );
}

// Node renderers read the canvas props from context, so the node-type map below stays stable
// (React Flow warns when it changes) while cards still re-render when issues, counts or the
// highlighted path change.
const CanvasContext = createContext<CanvasProps | null>(null);
const useCanvas = () => useContext(CanvasContext)!;
function TriggerNode() { return <TriggerCard p={useCanvas()} />; }
function StepNode({ data }: NodeProps<Node<CardData>>) { const p = useCanvas(); return data.kind === "step" ? <StepCard p={p} nodeId={data.nodeId} /> : null; }
function PlusNode({ data }: NodeProps<Node<CardData>>) { const p = useCanvas(); return data.kind === "plus" ? <PlusButton p={p} slot={data.slot} /> : null; }
function LabelNode({ data }: NodeProps<Node<CardData>>) { return data.kind === "label" ? <BranchLabel text={data.label} /> : null; }
const nodeTypes = { trigger: TriggerNode, step: StepNode, plus: PlusNode, label: LabelNode, end: EndMarker };

function TriggerCard({ p }: { p: CanvasProps }) {
  const triggers = p.graph.triggers;
  const reOn = p.reenroll !== "never";
  return (
    <div data-testid="trigger-card" style={{ width: TRIGGER_W, height: TRIGGER_H, boxSizing: "border-box", background: "var(--ui-surface-strong)", color: "var(--ui-text)", border: "2px solid " + (triggers.length ? "var(--ui-border)" : "var(--wf-danger)"), borderRadius: 8, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ height: 4, background: "#f97316" }} />
      <div style={{ padding: "8px 12px", flex: 1, minHeight: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 14 }}><Icon.bolt /> Contact enrolls when...</div>
        <div title={triggerSummary(triggers, p.catalog)} style={{ fontSize: 13, marginTop: 4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{triggerSummary(triggers, p.catalog)}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", padding: "6px 12px", borderTop: "1px solid var(--ui-border)" }}>
        <span style={muted}>Re-enroll {reOn ? "on" : "off"}</span>
        <button type="button" className="nodrag" style={{ ...linkBtn, marginLeft: "auto" }} onClick={p.onTrigger}>Details</button>
      </div>
      <Handle type="source" position={Position.Bottom} style={hidden} isConnectable={false} />
    </div>
  );
}

function StepCard({ p, nodeId }: { p: CanvasProps; nodeId: string }) {
  const node = p.graph.nodes[nodeId];
  if (!node) return null;
  const def = defOf(node);
  const category: Category = def?.category ?? "workflow";
  const CatIcon = ICON[category];
  const number = p.numbers[nodeId];
  const problems = [...missingParams(node, p.graph.nodes), ...(p.issues[nodeId] ?? [])];
  const summary = summarize(node, { ...p.ctx, catalog: p.catalog, numbers: p.numbers, nodes: p.graph.nodes });
  const count = p.counts ? p.counts[nodeId] ?? 0 : null;
  const onPath = p.highlight?.has(nodeId);
  const isMoving = p.movingId === nodeId;
  const title = (number ? number + ". " : "") + (def?.title ?? "Step");
  return (
    <div data-testid="step-card" data-node-id={nodeId} className={p.flashId === nodeId ? "wf-card-flash" : undefined}
      style={{ width: CARD_W, height: CARD_H, boxSizing: "border-box", background: "var(--ui-surface-strong)", color: "var(--ui-text)", border: "2px solid " + (onPath ? "var(--wf-highlight)" : problems.length ? "var(--wf-danger)" : "var(--ui-border)"), borderRadius: 8, overflow: "hidden", display: "flex", flexDirection: "column", opacity: isMoving ? 0.5 : 1, boxShadow: "var(--ui-shadow-soft)" }}>
      <Handle type="target" position={Position.Top} style={hidden} isConnectable={false} />
      <div style={{ height: 6, background: CATEGORY_COLOR[category] }} />
      <div role="button" tabIndex={0} className="nodrag" onClick={() => p.onOpenNode(nodeId)} onKeyDown={(e) => { if (e.key === "Enter") p.onOpenNode(nodeId); }} style={{ padding: "8px 12px 4px", flex: 1, minHeight: 0, cursor: "pointer" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: CATEGORY_COLOR[category], display: "inline-flex" }}><CatIcon /></span>
          <strong style={{ fontSize: 14, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</strong>
          {count !== null && <span data-testid="step-count" title="Contacts that reached this step" style={{ fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 10, background: "var(--wf-badge-bg)", color: "var(--wf-badge-fg)" }}>{count}</span>}
          {problems.length > 0 && <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 4, background: "var(--wf-danger)", display: "inline-block" }} />}
        </div>
        <div title={summary} style={{ fontSize: 13, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{summary}</div>
        {problems.length > 0 && <div data-testid="changes-needed" title={problems.join("; ")} style={{ fontSize: 12, fontWeight: 600, color: "var(--wf-danger)", marginTop: 4 }}>Changes needed</div>}
      </div>
      {!p.readOnly && (
        <div className="nodrag" style={{ display: "flex", alignItems: "center", gap: 2, padding: "2px 8px", borderTop: "1px solid var(--ui-border)" }}>
          <button type="button" style={iconBtn} title="Copy" aria-label={"Copy step " + (number ?? "")} onClick={() => p.onCopy(nodeId)}><Icon.copy /></button>
          <button type="button" style={iconBtn} title="Move" aria-label={"Move step " + (number ?? "")} onClick={() => p.onMove(nodeId)}><Icon.move /></button>
          {node.kind !== "goto" && <button type="button" style={iconBtn} title="Clone" aria-label={"Clone step " + (number ?? "")} onClick={() => p.onClone(nodeId)}><Icon.clone /></button>}
          <button type="button" style={iconBtn} title="Delete" aria-label={"Delete step " + (number ?? "")} onClick={() => p.onDelete(nodeId)}><Icon.trash /></button>
          <button type="button" style={{ ...linkBtn, marginLeft: "auto" }} onClick={() => p.onOpenNode(nodeId)}>Details</button>
        </div>
      )}
      <Handle type="source" position={Position.Bottom} style={hidden} isConnectable={false} />
    </div>
  );
}

function PlusButton({ p, slot }: { p: CanvasProps; slot: Slot }) {
  const moving = !!p.movingId;
  if (p.readOnly && !moving) return <div style={{ width: PLUS, height: PLUS }}><Handle type="target" position={Position.Top} style={hidden} isConnectable={false} /><Handle type="source" position={Position.Bottom} style={hidden} isConnectable={false} /></div>;
  return (
    <div style={{ width: PLUS, height: PLUS }}>
      <Handle type="target" position={Position.Top} style={hidden} isConnectable={false} />
      <button type="button" className="nodrag" data-testid="plus-button" data-slot={slot.parent + "|" + slot.port} aria-label={moving ? "Move here" : "Add action here"} onClick={() => p.onPlus(slot)}
        style={{ width: PLUS, height: PLUS, borderRadius: PLUS / 2, border: "2px solid " + (moving ? "var(--wf-highlight)" : "var(--wf-edge)"), background: moving ? "var(--wf-highlight)" : "var(--ui-surface-strong)", color: moving ? NAVY : "var(--ui-text)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
        <Icon.plus />
      </button>
      <Handle type="source" position={Position.Bottom} style={hidden} isConnectable={false} />
    </div>
  );
}

function BranchLabel({ text }: { text: string }) {
  return (
    <div data-testid="branch-label" style={{ width: LABEL_W, height: LABEL_H, boxSizing: "border-box", border: "1px solid var(--ui-border)", borderRadius: 6, background: "var(--ui-surface-strong)", color: "var(--ui-text)", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 8px", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }} title={text}>
      <Handle type="target" position={Position.Top} style={hidden} isConnectable={false} />
      {text}
      <Handle type="source" position={Position.Bottom} style={hidden} isConnectable={false} />
    </div>
  );
}

function EndMarker() {
  return (
    <div data-testid="end-marker" style={{ width: END_W, height: END_H, boxSizing: "border-box", borderRadius: END_H / 2, background: "var(--ui-surface-muted)", border: "1px solid var(--ui-border)", color: "var(--ui-text-muted)", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Handle type="target" position={Position.Top} style={hidden} isConnectable={false} />
      END
    </div>
  );
}
