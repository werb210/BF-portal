// BF_PORTAL_DASHBOARD_BOARD_v730 - one movable, resizable Dashboard board.
import { useCallback, useContext, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { DndContext, PointerSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { api } from "@/api";
import AppLoading from "@/components/layout/AppLoading";
import SiloContext from "@/context/SiloContext";
import { useAuth } from "@/hooks/useAuth";
import { moneyInline } from "@/lib/moneyByCurrency";
import { normalizeAnalyticsResponse } from "./DashboardAnalytics";
import { CardBody } from "@/pages/reports/ReportsBoard";
import TeamMessagesCard from "./TeamMessagesCard"; // BF_PORTAL_DASH_TEAM_MESSAGES_v758

export type Size = "third" | "half" | "full";
export type DashCard = { id: string; report: string; size: Size; days?: number };
type CatalogItem = { key: string; title: string; silo: string; size: "half" | "full"; description: string };
type Metrics = { activeApplications: number; dealsWonThisMonth: number; commissionEarned: number; newLeadsToday: number; pipelineByStage: Record<string, number>; commissionByStage?: Record<string, number>; commissionByStageCurrency?: Record<string, Record<string, number>>; commissionEarnedByCurrency?: Record<string, number>; fx?: { usdToCad: number; asOf: string | null } | null };
type Row = { name: string; value?: number; count?: number; applications?: number; funded?: number; approvals?: number; approvalRate?: number; revenue?: number; issueRate?: number; revenueByCurrency?: Record<string, number> };
type Analytics = ReturnType<typeof normalizeAnalyticsResponse>;

export const BUILTINS: Array<{ key: string; title: string; size: Size }> = [
  { key: "dash_kpis", title: "Key numbers", size: "full" },
  { key: "dash_team", title: "New team messages", size: "full" }, // BF_PORTAL_DASH_TEAM_MESSAGES_v758
  { key: "dash_pipeline", title: "Pipeline by stage", size: "full" },
  { key: "dash_totals", title: "Visits to funded", size: "full" },
  { key: "dash_dropoffs", title: "Application funnel and drop-offs", size: "full" },
  { key: "dash_acquisition", title: "Acquisition channels", size: "half" },
  { key: "dash_marketing_perf", title: "Marketing performance", size: "half" },
  { key: "dash_funding_product", title: "Funding by product", size: "half" },
  { key: "dash_doc_issues", title: "Document upload issues", size: "half" },
  { key: "dash_top_lenders", title: "Top lenders by approval rate", size: "half" },
];
export const isBuiltin = (key: string) => BUILTINS.some((item) => item.key === key);
export const defaultCards = (): DashCard[] => BUILTINS.map(({ key, size }) => ({ id: key, report: key, size }));
// BF_PORTAL_DASH_TEAM_MESSAGES_v758 - layouts saved before the Team card existed get it once, under
// Key numbers. A local flag remembers that, so removing the card later keeps it removed.
export const TEAM_CARD_FLAG = "bf.dash.teamCardAdded.v758";
export function withTeamCardOnce(cards: DashCard[], alreadyAdded: boolean): { cards: DashCard[]; added: boolean } {
  if (alreadyAdded || cards.some((c) => c.report === "dash_team")) return { cards, added: false };
  const at = cards.findIndex((c) => c.report === "dash_kpis");
  const next = [...cards];
  next.splice(at < 0 ? 0 : at + 1, 0, { id: "dash_team", report: "dash_team", size: "full" });
  return { cards: next, added: true };
}
export function withBuiltins(saved?: DashCard[] | null): DashCard[] {
  if (!saved?.length) return defaultCards();
  return saved.some((card) => isBuiltin(card.report)) ? saved : [...defaultCards(), ...saved];
}
export function reorder(cards: DashCard[], id: string, beforeId: string | null): DashCard[] {
  const card = cards.find((item) => item.id === id);
  if (!card || id === beforeId) return cards;
  const next = cards.filter((item) => item.id !== id);
  const index = beforeId ? next.findIndex((item) => item.id === beforeId) : -1;
  next.splice(index < 0 ? next.length : index, 0, card);
  return next;
}

// BF_PORTAL_DASHBOARD_RANGE_PILLS_v734 - the period buttons lost their styling in the merge and read as
// "7d30d90d365d"; they are now labelled pills with the chosen period highlighted.
// BF_PORTAL_DASHBOARD_CONTRAST_v733 - every card sets its own dark text on its own light
// background; text was inheriting a light page colour and vanished on the white cards.
// Fixed colours (not theme variables): the cards are always white, so their text is always
// Boreal navy - whatever colour scheme the browser or a parent element asks for.
export const CARD_BG = "#ffffff";
export const CARD_TEXT = "#0B1F3A";
const box: CSSProperties = { background: CARD_BG, color: CARD_TEXT, border: "1px solid #E4EAF2", borderRadius: 8, padding: 12 };
const span: Record<Size, number> = { third: 2, half: 3, full: 6 };
const fmt = (value?: number) => value == null ? "—" : Number(value).toLocaleString();
const newId = () => Math.random().toString(36).slice(2, 10);
const splitMoney = (values?: Record<string, number>) => {
  const parts = (["CAD", "USD"] as const).filter((currency) => (values?.[currency] ?? 0) > 0).map((currency) => `${currency === "CAD" ? "CA" : "US"}$${Math.round(values?.[currency] ?? 0).toLocaleString()}`);
  return parts.length ? parts.join("\n") : null;
};
function Stat({ label, value }: { label: string; value: string }) { return <div className="drawer-section"><div className="drawer-section__title">{label}</div><div style={{ fontSize: 26, fontWeight: 700, whiteSpace: "pre-line" }}>{value}</div></div>; }
function MiniTable({ rows, value }: { rows: Row[]; value: (row: Row) => string }) { return rows.length ? <>{rows.slice(0, 6).map((row) => <div key={row.name} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "7px 0", borderTop: "1px solid var(--ui-border)" }}><strong>{row.name}</strong><span>{value(row)}</span></div>)}</> : <div style={{ color: "#51617D" }}>No data for this range.</div>; }

// BF_PORTAL_DASHBOARD_MONEY_ADMIN_v732 - commission and revenue figures are for Admin only (Todd, Andrew).
export function builtinBody(key: string, { metrics, analytics, range, isAdmin = false }: { metrics: Metrics | null; analytics: Analytics; range: number; isAdmin?: boolean }): ReactNode {
  if (key === "dash_team") return <TeamMessagesCard />; // BF_PORTAL_DASH_TEAM_MESSAGES_v758
  if (key === "dash_kpis" && !isAdmin) return <div className="grid gap-3 grid-cols-2 md:grid-cols-3"><Stat label="Active Applications" value={fmt(metrics?.activeApplications)} /><Stat label="Deals Won This Month" value={fmt(metrics?.dealsWonThisMonth)} /><Stat label="New CRM Contacts Today" value={fmt(metrics?.newLeadsToday)} /></div>;
  if (key === "dash_kpis") return <div className="grid gap-3 grid-cols-2 md:grid-cols-4"><Stat label="Active Applications" value={fmt(metrics?.activeApplications)} /><Stat label="Deals Won This Month" value={fmt(metrics?.dealsWonThisMonth)} /><Stat label="Commission Earned (all time)" value={metrics ? splitMoney(metrics.commissionEarnedByCurrency) ?? `$${fmt(metrics.commissionEarned)}` : "—"} /><Stat label="New CRM Contacts Today" value={fmt(metrics?.newLeadsToday)} /></div>;
  if (key === "dash_pipeline") {
    const stages = Object.entries(metrics?.pipelineByStage ?? {}).filter(([stage]) => stage !== "Rejected");
    const total = stages.reduce((sum, [, count]) => sum + count, 0);
    return <div>{stages.map(([stage, count]) => <div key={stage} style={{ display: "grid", gridTemplateColumns: isAdmin ? "minmax(120px,200px) 1fr 50px 120px" : "minmax(120px,200px) 1fr 50px", gap: 12, marginBottom: 10 }}><strong>{stage}</strong><div style={{ height: 8, background: "var(--ui-surface)", marginTop: 6 }}><div style={{ width: `${total ? count / total * 100 : 0}%`, height: "100%", background: "var(--ui-accent-blue)" }} /></div><strong>{count}</strong>{isAdmin && <span>{splitMoney(metrics?.commissionByStageCurrency?.[stage]) ?? `$${fmt(metrics?.commissionByStage?.[stage])}`}</span>}</div>)}{metrics && !stages.length && <span>No applications in the pipeline yet.</span>}</div>;
  }
  const funnel = analytics.revenueFunnel ?? { visits: 0, applications: 0, submitted: 0, funded: 0 };
  if (key === "dash_totals") return <div className="grid gap-3 grid-cols-2 md:grid-cols-4"><Stat label="GA4 Visits" value={fmt(funnel.visits)} /><Stat label="Applications" value={fmt(funnel.applications)} /><Stat label="Submitted" value={fmt(funnel.submitted)} /><Stat label="Funded" value={fmt(funnel.funded)} /><small style={{ gridColumn: "1 / -1" }}>Last {range} days</small></div>;
  if (key === "dash_dropoffs") { const stages = Object.entries(analytics.applicationFunnel ?? {}); const max = Math.max(1, ...stages.map(([, count]) => count)); return stages.length ? <>{stages.map(([stage, count]) => <div key={stage} style={{ display: "grid", gridTemplateColumns: "160px 1fr 70px", gap: 10, marginTop: 8 }}><span>{stage}</span><div style={{ height: 8, background: "var(--ui-surface)" }}><div style={{ width: `${count / max * 100}%`, height: "100%", background: "var(--ui-accent-blue)" }} /></div><strong>{count}</strong></div>)}</> : <span>No funnel data for this range.</span>; }
  if (key === "dash_acquisition") return <MiniTable rows={(analytics.acquisitionChannels ?? []) as Row[]} value={(r) => `${fmt(r.applications ?? r.count ?? r.value)} apps`} />;
  if (key === "dash_marketing_perf" && !isAdmin) return <div style={{ color: "#51617D", fontSize: 13 }}>Revenue figures are for Admin only.</div>;
  if (key === "dash_marketing_perf") return <MiniTable rows={(analytics.marketingPerformance ?? []) as Row[]} value={(r) => moneyInline(r.revenueByCurrency) ?? `$${fmt(r.revenue ?? r.value)}`} />;
  if (key === "dash_funding_product") return <MiniTable rows={(analytics.fundingByProduct ?? []) as Row[]} value={(r) => `${fmt(r.funded ?? r.count ?? r.value)} funded`} />;
  if (key === "dash_doc_issues") return <MiniTable rows={(analytics.documentUploadIssues ?? []) as Row[]} value={(r) => r.issueRate == null ? `${fmt(r.count ?? r.value)} issues` : `${r.issueRate}% issue rate`} />;
  if (key === "dash_top_lenders") return <MiniTable rows={(analytics.topLendersByApprovalRate ?? []) as Row[]} value={(r) => r.approvalRate == null ? `${fmt(r.approvals ?? r.value)} approvals` : `${r.approvalRate}% approvals`} />;
  return null;
}

function BoardCard({ card, title, wide, children, onRemove, onSize }: { card: DashCard; title: string; wide: boolean; children: ReactNode; onRemove: () => void; onSize: (size: Size) => void }) {
  const drag = useDraggable({ id: `dash:${card.id}`, data: { id: card.id } });
  const drop = useDroppable({ id: `dashbefore:${card.id}`, data: { id: card.id } });
  const [menu, setMenu] = useState(false);
  return <div ref={drop.setNodeRef} style={{ gridColumn: `span ${wide ? span[card.size] : 6}`, minWidth: 0 }}><section ref={drag.setNodeRef} data-testid={`dash-card-${card.report}`} style={{ ...box, height: "100%", opacity: drag.isDragging ? .5 : 1, outline: drop.isOver ? "2px dashed var(--ui-text)" : "none", transform: drag.transform ? `translate(${drag.transform.x}px, ${drag.transform.y}px)` : undefined }}><header style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}><button type="button" aria-label={`Drag ${title}`} {...drag.listeners} {...drag.attributes} style={{ touchAction: "none" }}>⋮⋮</button><strong style={{ flex: 1 }}>{title}</strong><button type="button" className="ui-button ui-button--secondary" aria-label={`Options for ${title}`} onClick={() => setMenu(!menu)}>...</button></header>{menu && <div role="menu">{(["third", "half", "full"] as Size[]).map((size) => <button key={size} type="button" role="menuitemradio" aria-checked={card.size === size} className="ui-button ui-button--secondary" onClick={() => { onSize(size); setMenu(false); }}>{size === "third" ? "Small" : size === "half" ? "Medium" : "Wide"}</button>)}<button type="button" role="menuitem" className="ui-button ui-button--secondary" onClick={onRemove}>Remove</button></div>}{children}</section></div>;
}

export default function DashboardHome() {
  const { isAuthenticated, isLoading, role } = useAuth() as { isAuthenticated: boolean; isLoading: boolean; role?: string | null };
  const isAdmin = String(role ?? "").toLowerCase() === "admin";
  const silo = String((useContext(SiloContext) as { silo?: string } | null)?.silo ?? "BF").toUpperCase();
  const [metrics, setMetrics] = useState<Metrics | null>(null), [metricsFailed, setMetricsFailed] = useState(false);
  const [range, setRange] = useState(30), [analytics, setAnalytics] = useState<Analytics>(normalizeAnalyticsResponse(null));
  const [catalog, setCatalog] = useState<CatalogItem[]>([]), [tabs, setTabs] = useState<unknown[]>([]), [cards, setCards] = useState<DashCard[] | null>(null);
  const [adding, setAdding] = useState(false), [message, setMessage] = useState<string | null>(null), [wide, setWide] = useState(() => typeof window === "undefined" || window.innerWidth >= 900);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }));
  useEffect(() => { const resize = () => setWide(window.innerWidth >= 900); window.addEventListener("resize", resize); return () => window.removeEventListener("resize", resize); }, []);
  const loadMetrics = useCallback(() => { setMetricsFailed(false); api.get<Metrics>(`/api/dashboard/metrics?silo=${encodeURIComponent(silo)}`).then(setMetrics).catch(() => setMetricsFailed(true)); }, [silo]);
  useEffect(() => { if (isAuthenticated) loadMetrics(); }, [isAuthenticated, loadMetrics]);
  useEffect(() => { if (isAuthenticated) api.get<unknown>(`/api/dashboard/analytics?range=${range}&silo=${encodeURIComponent(silo)}`).then((data) => setAnalytics(normalizeAnalyticsResponse(data))).catch(() => setAnalytics(normalizeAnalyticsResponse(null))); }, [isAuthenticated, range, silo]);
  useEffect(() => { if (!isAuthenticated) return; Promise.all([api.get<{ reports: CatalogItem[] }>(`/api/reports/catalog?silo=${silo}&for=dashboard`).catch(() => ({ reports: [] })), api.get<{ tabs?: unknown[]; dashboard?: { cards?: DashCard[] } | null }>(`/api/reports/layouts?silo=${silo}`).catch(() => ({ tabs: [], dashboard: null }))]).then(([c, layout]) => { setCatalog(c.reports ?? []); setTabs(layout.tabs ?? []);
    // BF_PORTAL_DASH_TEAM_MESSAGES_v758
    let flagged = false; try { flagged = window.localStorage.getItem(TEAM_CARD_FLAG) === "1"; } catch { flagged = false; }
    const withTeam = withTeamCardOnce(withBuiltins(layout.dashboard?.cards), flagged);
    setCards(withTeam.cards);
    try { window.localStorage.setItem(TEAM_CARD_FLAG, "1"); } catch { /* private mode - the card may be offered again */ }
    if (withTeam.added && layout.dashboard?.cards?.length) void api.put("/api/reports/layouts", { silo, tabs: layout.tabs ?? [], dashboard: { cards: withTeam.cards } }).catch((err: unknown) => console.warn("[dashboard] could not save the added Team card", err));
  }); }, [isAuthenticated, silo]);
  const save = useCallback(async (next: DashCard[]) => { setCards(next); try { await api.put("/api/reports/layouts", { silo, tabs, dashboard: { cards: next } }); setMessage(null); } catch { setMessage("Could not save your Dashboard layout. Your last change may be lost if you leave this page."); } }, [silo, tabs]);
  const titles = useMemo(() => new Map([...catalog.map((r) => [r.key, r.title] as const), ...BUILTINS.map((r) => [r.key, r.title] as const)]), [catalog]);
  if (isLoading) return <AppLoading />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  const present = new Set((cards ?? []).map((card) => card.report));
  const addable = [...BUILTINS.filter((item) => !present.has(item.key)).map((item) => ({ ...item, description: "Standard Dashboard section" })), ...catalog.filter((item) => item.silo === silo && !isBuiltin(item.key) && !present.has(item.key))];
  const onDragEnd = (event: DragEndEvent) => { const from = event.active.data.current?.id as string | undefined, to = event.over?.data.current?.id as string | undefined; if (cards && from && to) void save(reorder(cards, from, to)); };
  return <div className="space-y-4" data-testid="dashboard-home" style={{ color: CARD_TEXT }}><div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}><h1>Dashboard</h1><div><div role="group" aria-label="Analytics date range" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 12, color: "#51617D", marginRight: 2 }}>Period:</span>{[7, 30, 90, 365].map((days) => <button key={days} type="button" aria-pressed={range === days} onClick={() => setRange(days)} style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid #E4EAF2", fontSize: 13, fontWeight: 600, cursor: "pointer", background: range === days ? "#0B1F3A" : "#ffffff", color: range === days ? "#ffffff" : "#0B1F3A" }}>{days === 365 ? "1 year" : days + " days"}</button>)}</div><button type="button" className="ui-button ui-button--primary" data-testid="dash-add" onClick={() => setAdding(!adding)}>+ Add report</button><button type="button" className="ui-button ui-button--secondary" onClick={() => { if (window.confirm("Put the Dashboard back to the standard layout? Reports you added are removed.")) void save(defaultCards()); }}>Reset layout</button></div></div>
    {metricsFailed && <div role="alert">Couldn't load dashboard data <button type="button" onClick={loadMetrics}>Retry</button></div>}{message && <p role="status">{message}</p>}
    {adding && <div style={box} data-testid="dash-library">{!addable.length && <p>Everything is already on your Dashboard.</p>}{addable.map((item) => <button key={item.key} type="button" className="ui-button ui-button--secondary" onClick={() => { void save([...(cards ?? []), { id: isBuiltin(item.key) ? item.key : newId(), report: item.key, size: item.size }]); setAdding(false); }}><strong>{item.title}</strong><br /><small>{item.description}</small></button>)}</div>}
    {cards === null ? <AppLoading /> : <DndContext sensors={sensors} onDragEnd={onDragEnd}><div style={{ display: "grid", gridTemplateColumns: "repeat(6,minmax(0,1fr))", gap: 12 }}>{cards.map((card) => <BoardCard key={card.id} card={card} wide={wide} title={titles.get(card.report) ?? card.report} onRemove={() => void save(cards.filter((item) => item.id !== card.id))} onSize={(size) => void save(cards.map((item) => item.id === card.id ? { ...item, size } : item))}>{isBuiltin(card.report) ? builtinBody(card.report, { metrics, analytics, range, isAdmin }) : <CardBody report={card.report} days={card.days} />}</BoardCard>)}</div></DndContext>}
  </div>;
}
