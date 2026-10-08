// BF_PORTAL_REPORTS_SECTION_v714 - drag-and-drop Reports board.
import { useCallback, useContext, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { DndContext, PointerSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { api } from "@/api";
import SiloContext from "@/context/SiloContext";
import { AdsStoryPanel, DropoffPanel, VisitorsPanel } from "@/components/marketing/GoogleAdsAnalytics";
import BIDashboard from "@/silos/bi/dashboard/BIDashboard";
import BIInsuranceReports from "./BIInsuranceReports"; // BF_PORTAL_REPORTS15_18_v769
import { ReportDataCard } from "./ReportDataCards";

export type ReportDef = { key: string; title: string; silo: string; group: "money" | "marketing" | "operations"; size: "half" | "full"; description: string };
export type Card = { id: string; report: string; size: "half" | "full"; days?: number };
export type Tab = { id: string; name: string; cards: Card[] };
type Layout = { tabs: Tab[]; dashboard: { cards: Card[] } | null; teamTabs: Tab[]; canPublishTeamTabs: boolean };
const box: CSSProperties = { background: "var(--ui-surface-strong)", border: "1px solid var(--ui-border)", borderRadius: 8, padding: 12 };
const newId = () => Math.random().toString(36).slice(2, 10);

export function moveCard(tabs: Tab[], fromTab: string, cardId: string, toTab: string, beforeCardId: string | null): Tab[] {
  const card = tabs.find((t) => t.id === fromTab)?.cards.find((c) => c.id === cardId);
  if (!card) return tabs;
  const without = tabs.map((t) => t.id === fromTab ? { ...t, cards: t.cards.filter((c) => c.id !== cardId) } : t);
  return without.map((t) => {
    if (t.id !== toTab) return t;
    const cards = [...t.cards];
    const index = beforeCardId ? cards.findIndex((c) => c.id === beforeCardId) : -1;
    cards.splice(index < 0 ? cards.length : index, 0, card);
    return { ...t, cards };
  });
}

export function moveTab(tabs: Tab[], tabId: string, beforeTabId: string): Tab[] {
  const tab = tabs.find((t) => t.id === tabId);
  if (!tab || tabId === beforeTabId) return tabs;
  const rest = tabs.filter((t) => t.id !== tabId);
  const index = rest.findIndex((t) => t.id === beforeTabId);
  rest.splice(index < 0 ? rest.length : index, 0, tab);
  return rest;
}

export function CardBody({ report, days }: { report: string; days?: number }): ReactNode {
  if (report === "ads_story") return <AdsStoryPanel />;
  if (report === "ads_dropoff") return <DropoffPanel />;
  if (report === "ads_visitors") return <VisitorsPanel />;
  if (report === "bi_dashboard") return <BIDashboard />;
  if (report === "bi_insurance") return <BIInsuranceReports />; // BF_PORTAL_REPORTS15_18_v769
  return <ReportDataCard report={report} days={days} />;
}

function DraggableCard({ tabId, card, def, onRemove, onDashboard, onResize, children }: { tabId: string; card: Card; def?: ReportDef; onRemove: () => void; onDashboard?: () => void; onResize: () => void; children: ReactNode }) {
  const drag = useDraggable({ id: `card:${tabId}:${card.id}`, data: { type: "card", tabId, cardId: card.id } });
  const drop = useDroppable({ id: `before:${tabId}:${card.id}`, data: { type: "before", tabId, cardId: card.id } });
  const [menu, setMenu] = useState(false);
  const style: CSSProperties = { ...box, gridColumn: card.size === "full" ? "1 / -1" : "auto", opacity: drag.isDragging ? 0.5 : 1, outline: drop.isOver ? "2px dashed var(--ui-text)" : "none", transform: drag.transform ? `translate(${drag.transform.x}px, ${drag.transform.y}px)` : undefined, position: "relative", zIndex: drag.isDragging ? 10 : "auto" };
  return <div ref={drop.setNodeRef} style={{ gridColumn: style.gridColumn }}><section ref={drag.setNodeRef} style={style} data-testid={`report-card-${card.report}`}>
    <header style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}><button type="button" aria-label={`Drag ${def?.title ?? card.report}`} {...drag.listeners} {...drag.attributes} style={{ cursor: "grab", border: "none", background: "transparent", color: "var(--ui-text)", fontSize: 16, touchAction: "none" }}>⠇</button><strong style={{ color: "var(--ui-text)", flex: 1 }}>{def?.title ?? card.report}</strong><button type="button" className="ui-button ui-button--secondary" aria-label="Card options" onClick={() => setMenu((value) => !value)}>⋯</button></header>
    {menu && <div role="menu" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>{onDashboard && <button type="button" role="menuitem" className="ui-button ui-button--secondary" onClick={() => { onDashboard(); setMenu(false); }}>Add to Dashboard</button>}<button type="button" role="menuitem" className="ui-button ui-button--secondary" onClick={() => { onResize(); setMenu(false); }}>{card.size === "full" ? "Make narrow" : "Make wide"}</button><button type="button" role="menuitem" className="ui-button ui-button--secondary" onClick={() => { onRemove(); setMenu(false); }}>Remove</button></div>}
    {children}
  </section></div>;
}

function TabButton({ tab, active, onClick }: { tab: Tab; active: boolean; onClick: () => void }) {
  const drop = useDroppable({ id: `tab:${tab.id}`, data: { type: "tab", tabId: tab.id } });
  const drag = useDraggable({ id: `tabdrag:${tab.id}`, data: { type: "tabdrag", tabId: tab.id } });
  return <span ref={drop.setNodeRef} style={{ outline: drop.isOver ? "2px dashed var(--ui-text)" : "none", borderRadius: 8 }}><button ref={drag.setNodeRef} {...drag.listeners} {...drag.attributes} type="button" onClick={onClick} className={active ? "ui-button ui-button--primary" : "ui-button ui-button--secondary"} style={{ touchAction: "none" }} data-testid={`reports-tab-${tab.name}`}>{tab.name}</button></span>;
}

export default function ReportsBoard({ mode = "reports" }: { mode?: "reports" | "dashboard" }) {
  const silo = String((useContext(SiloContext) as { silo?: string } | null)?.silo ?? "BF").toUpperCase();
  const [catalog, setCatalog] = useState<ReportDef[]>([]);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [active, setActive] = useState("");
  const [adding, setAdding] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }));
  const load = useCallback(async () => {
    try {
      const [c, l] = await Promise.all([api.get<{ reports: ReportDef[] }>(`/api/reports/catalog?silo=${silo}`), api.get<Layout>(`/api/reports/layouts?silo=${silo}`)]);
      setCatalog(Array.isArray(c?.reports) ? c.reports : []);
      const next = { tabs: l?.tabs ?? [], dashboard: l?.dashboard ?? null, teamTabs: l?.teamTabs ?? [], canPublishTeamTabs: Boolean(l?.canPublishTeamTabs) };
      if (mode === "reports" && !next.tabs.length && !next.teamTabs.length) next.tabs = [{ id: newId(), name: "My reports", cards: [] }];
      setLayout(next); setActive((value) => value || (mode === "dashboard" ? "dashboard" : next.tabs[0]?.id ?? next.teamTabs[0]?.id ?? ""));
    } catch { setLayout({ tabs: [], dashboard: null, teamTabs: [], canPublishTeamTabs: false }); }
  }, [mode, silo]);
  useEffect(() => { void load(); }, [load]);
  const save = useCallback(async (next: Layout) => { setLayout(next); try { await api.put("/api/reports/layouts", { silo, tabs: next.tabs, dashboard: next.dashboard ?? { cards: [] } }); setMsg(null); } catch { setMsg("Could not save the layout. Your last change may be lost if you leave this page."); } }, [silo]);
  const byKey = useMemo(() => new Map(catalog.map((r) => [r.key, r])), [catalog]);
  if (!layout) return <p style={{ color: "var(--ui-text-muted)" }}>Loading reports...</p>;
  const editable = mode === "dashboard" ? [{ id: "dashboard", name: "Dashboard", cards: layout.dashboard?.cards ?? [] }] : layout.tabs;
  const team = mode === "reports" ? layout.teamTabs.find((t) => t.id === active) : undefined;
  const current = team ?? editable.find((t) => t.id === active) ?? editable[0];
  const isTeam = Boolean(team);
  const commitTabs = (tabs: Tab[]) => mode === "dashboard" ? save({ ...layout, dashboard: { cards: tabs[0]?.cards ?? [] } }) : save({ ...layout, tabs });
  const updateCurrent = (cards: Card[]) => commitTabs(editable.map((t) => t.id === current?.id ? { ...t, cards } : t));
  const onDragEnd = (e: DragEndEvent) => { const a = e.active.data.current; const o = e.over?.data.current; if (!a || !o || isTeam) return; if (a.type === "card" && o.type === "before") void commitTabs(moveCard(editable, a.tabId, a.cardId, o.tabId, o.cardId === a.cardId ? null : o.cardId)); else if (a.type === "card" && o.type === "tab" && o.tabId !== a.tabId) void commitTabs(moveCard(editable, a.tabId, a.cardId, o.tabId, null)); else if (a.type === "tabdrag" && o.type === "tab") void commitTabs(moveTab(editable, a.tabId, o.tabId)); };
  return <div data-testid={mode === "dashboard" ? "dashboard-board" : "reports-board"}><DndContext sensors={sensors} onDragEnd={onDragEnd}>
    {mode === "reports" && <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>{layout.tabs.map((t) => <TabButton key={t.id} tab={t} active={current?.id === t.id} onClick={() => setActive(t.id)} />)}{layout.teamTabs.map((t) => <button key={t.id} type="button" className={current?.id === t.id ? "ui-button ui-button--primary" : "ui-button ui-button--secondary"} onClick={() => setActive(t.id)}>{t.name} (team)</button>)}<button type="button" className="ui-button ui-button--secondary" onClick={() => { const tab = { id: newId(), name: "New tab", cards: [] }; void commitTabs([...layout.tabs, tab]); setActive(tab.id); }}>+ Tab</button>{current && !isTeam && <><button type="button" className="ui-button ui-button--secondary" onClick={() => { const name = window.prompt("Tab name", current.name); if (name?.trim()) void commitTabs(layout.tabs.map((t) => t.id === current.id ? { ...t, name: name.trim().slice(0, 60) } : t)); }}>Rename</button><button type="button" className="ui-button ui-button--secondary" onClick={() => { if (window.confirm(`Delete the tab "${current.name}"?`)) { const rest = layout.tabs.filter((t) => t.id !== current.id); void commitTabs(rest); setActive(rest[0]?.id ?? ""); } }}>Delete tab</button></>}{layout.canPublishTeamTabs && !isTeam && current && <button type="button" className="ui-button ui-button--secondary" onClick={async () => { if (!window.confirm(`Publish "${current.name}" as a team tab everyone sees? People only see the cards their role allows.`)) return; const teamTabs = [...layout.teamTabs.filter((t) => t.name !== current.name), { ...current, id: newId() }]; try { await api.put("/api/reports/team-tabs", { silo, tabs: teamTabs }); setLayout({ ...layout, teamTabs }); setMsg("Published as a team tab."); } catch { setMsg("Could not publish the team tab."); } }}>Share with team</button>}</div>}
    {!isTeam && current && <div style={{ marginBottom: 12, display: "flex", gap: 8, alignItems: "center" }}><button type="button" className="ui-button ui-button--primary" onClick={() => setAdding((v) => !v)} data-testid="reports-add">+ Add report</button>{msg && <span role="status" style={{ color: "var(--ui-text)", fontSize: 13 }}>{msg}</span>}</div>}
    {adding && current && <div style={{ ...box, marginBottom: 12, display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }} data-testid="reports-library">{!catalog.some((r) => r.silo === silo) && <p style={{ color: "var(--ui-text-muted)" }}>No reports for this silo yet.</p>}{catalog.filter((r) => r.silo === silo).map((r) => <button key={r.key} type="button" className="ui-button ui-button--secondary" style={{ textAlign: "left", whiteSpace: "normal", height: "auto", padding: 10 }} onClick={() => { void updateCurrent([...current.cards, { id: newId(), report: r.key, size: r.size }]); setAdding(false); }}><strong>{r.title}</strong><br /><span style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>{r.description}</span></button>)}</div>}
    {current && !current.cards.length && !adding && <p style={{ color: "var(--ui-text-muted)" }}>{isTeam ? "This team tab is empty." : "No reports here yet. Press + Add report."}</p>}
    {current && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 420px), 1fr))", gap: 12 }}>{current.cards.map((card) => isTeam ? <section key={card.id} style={{ ...box, gridColumn: card.size === "full" ? "1 / -1" : "auto" }}><strong style={{ color: "var(--ui-text)" }}>{byKey.get(card.report)?.title ?? card.report}</strong><CardBody report={card.report} days={card.days} /></section> : <DraggableCard key={card.id} tabId={current.id} card={card} def={byKey.get(card.report)} onRemove={() => void updateCurrent(current.cards.filter((c) => c.id !== card.id))} onResize={() => void updateCurrent(current.cards.map((c) => c.id === card.id ? { ...c, size: c.size === "full" ? "half" : "full" } : c))} onDashboard={mode === "reports" ? () => void save({ ...layout, dashboard: { cards: [...(layout.dashboard?.cards ?? []), { ...card, id: newId() }] } }).then(() => setMsg("Added to your Dashboard.")) : undefined}><CardBody report={card.report} days={card.days} /></DraggableCard>)}</div>}
  </DndContext></div>;
}
