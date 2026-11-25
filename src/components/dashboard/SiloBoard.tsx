// BF_PORTAL_SILO_DASHBOARDS_v1 - the BI and Keystone Dashboards as movable boards, like BF's: drag a card to move it,
// "..." to make it Small / Medium / Wide or remove it, "+ Add section" to put a removed one back, "Reset layout" for
// the standard board. The layout is saved per person and per business on BF-Server (/api/reports/layouts?silo=BI|KS).
// A copy is also kept in this browser, used only when the server has no layout for this business yet (or would
// answer for another one), so a server that predates Keystone layouts can never overwrite the BF Dashboard.
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { DndContext, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { api } from "@/api";
import { confirmAction } from "@/lib/confirmAction";
import { BoardCard, CARD_BG, CARD_TEXT, reorder, type DashCard, type Size } from "@/pages/dashboard/DashboardHome";

export type BoardSection = { key: string; title: string; size: Size; description: string; standard?: boolean; render: () => ReactNode };

const localKey = (silo: string) => `bf.dash.${silo}.v1`;
function readLocal(silo: string): DashCard[] | null {
  try { const raw = window.localStorage.getItem(localKey(silo)); const v = raw ? JSON.parse(raw) : null; return Array.isArray(v) ? v : null; } catch { return null; }
}
function writeLocal(silo: string, cards: DashCard[]) { try { window.localStorage.setItem(localKey(silo), JSON.stringify(cards)); } catch { /* private mode - the server copy still holds it */ } }

export function standardCards(sections: BoardSection[]): DashCard[] {
  return sections.filter((s) => s.standard !== false).map((s) => ({ id: s.key, report: s.key, size: s.size }));
}
/** Keep only cards this board can draw, once each; nothing usable means the standard board. */
export function usableCards(saved: DashCard[] | null | undefined, sections: BoardSection[]): DashCard[] {
  const known = new Set(sections.map((s) => s.key)); const seen = new Set<string>();
  const out = (saved ?? []).filter((c) => c && known.has(c.report) && !seen.has(c.report) && seen.add(c.report));
  return out.length ? out : standardCards(sections);
}

type Layout = { silo?: string; tabs?: unknown[]; dashboard?: { cards?: DashCard[] } | null };

export default function SiloBoard({ silo, title, sections, actions }: { silo: "BI" | "KS"; title: string; sections: BoardSection[]; actions?: ReactNode }) {
  const [cards, setCards] = useState<DashCard[] | null>(null);
  const [tabs, setTabs] = useState<unknown[]>([]);
  const [serverOk, setServerOk] = useState(false);
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [wide, setWide] = useState(() => typeof window === "undefined" || window.innerWidth >= 900);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }));
  useEffect(() => { const resize = () => setWide(window.innerWidth >= 900); window.addEventListener("resize", resize); return () => window.removeEventListener("resize", resize); }, []);

  useEffect(() => {
    let live = true;
    api.get<Layout>(`/api/reports/layouts?silo=${silo}`)
      .then((layout) => {
        if (!live) return;
        const mine = String(layout?.silo ?? "").toUpperCase() === silo;
        setServerOk(mine);
        if (mine) setTabs(Array.isArray(layout.tabs) ? layout.tabs : []);
        const server = mine ? layout.dashboard?.cards : null;
        setCards(usableCards(server?.length ? server : readLocal(silo), sections));
      })
      .catch(() => { if (live) { setServerOk(false); setCards(usableCards(readLocal(silo), sections)); } });
    return () => { live = false; };
    // sections are rebuilt each render; the layout only needs loading once per business
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [silo]);

  const save = useCallback(async (next: DashCard[]) => {
    setCards(next); writeLocal(silo, next);
    if (!serverOk) return;
    try { await api.put("/api/reports/layouts", { silo, tabs, dashboard: { cards: next } }); setMessage(null); }
    catch { setMessage("Could not save your Dashboard layout on the server. It is kept in this browser for now."); }
  }, [silo, tabs, serverOk]);

  const byKey = useMemo(() => new Map(sections.map((s) => [s.key, s] as const)), [sections]);
  const present = new Set((cards ?? []).map((c) => c.report));
  const addable = sections.filter((s) => !present.has(s.key));
  const onDragEnd = (event: DragEndEvent) => {
    const from = event.active.data.current?.id as string | undefined, to = event.over?.data.current?.id as string | undefined;
    if (cards && from && to) void save(reorder(cards, from, to));
  };

  return (
    <div className="space-y-4" data-testid={`silo-board-${silo}`}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ margin: 0 }}>{title}</h1>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {actions}
          <button type="button" className="ui-button ui-button--primary" data-testid="board-add" onClick={() => setAdding(!adding)}>+ Add section</button>
          <button type="button" className="ui-button ui-button--secondary" onClick={async () => { if (await confirmAction("Put the Dashboard back to the standard layout?")) void save(standardCards(sections)); }}>Reset layout</button>
        </div>
      </div>
      {message && <p role="status">{message}</p>}
      {adding && (
        <div data-testid="board-library" style={{ background: CARD_BG, color: CARD_TEXT, border: "1px solid #E4EAF2", borderRadius: 8, padding: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
          {!addable.length && <p style={{ margin: 0 }}>Everything is already on your Dashboard.</p>}
          {addable.map((s) => (
            <button key={s.key} type="button" className="ui-button ui-button--secondary" style={{ textAlign: "left" }} onClick={() => { void save([...(cards ?? []), { id: s.key, report: s.key, size: s.size }]); setAdding(false); }}>
              <strong>{s.title}</strong><br /><small>{s.description}</small>
            </button>
          ))}
        </div>
      )}
      {cards === null ? <p>Loading the Dashboard…</p> : (
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6,minmax(0,1fr))", gap: 12 }}>
            {cards.map((card) => {
              const section = byKey.get(card.report);
              if (!section) return null;
              return (
                <BoardCard key={card.id} card={card} wide={wide} title={section.title}
                  onRemove={() => void save(cards.filter((c) => c.id !== card.id))}
                  onSize={(size) => void save(cards.map((c) => (c.id === card.id ? { ...c, size } : c)))}>
                  {section.render()}
                </BoardCard>
              );
            })}
          </div>
        </DndContext>
      )}
    </div>
  );
}

// Small shared pieces for the cards (fixed navy on the white card, so they read in any theme).
export const MUTED = "#51617D";
export function Num({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "warn" | "bad" | "good" }) {
  const edge = tone === "bad" ? "#DC2626" : tone === "warn" ? "#D97706" : tone === "good" ? "#059669" : "#E4EAF2";
  return (
    <div style={{ border: `1px solid ${edge}`, borderRadius: 8, padding: 10, minWidth: 0 }}>
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em", color: MUTED }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{value}</div>
      {hint ? <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{hint}</div> : null}
    </div>
  );
}
export const numGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 } as const;
export const cardLink = { color: "#1E3A8A", fontWeight: 600, textDecoration: "underline" } as const;

/** People in each email flow and how they are doing. */
export type FlowRow = { id: string; name: string; status?: string; people?: number; waiting?: number; emailed?: number; opened?: number; clicked?: number; stopped?: number };
export function FlowsTable({ flows, error }: { flows: FlowRow[] | null; error?: boolean }) {
  if (error) return <p style={{ margin: 0, color: MUTED }}>Could not load the email flows.</p>;
  if (!flows) return <p style={{ margin: 0, color: MUTED }}>Loading…</p>;
  if (!flows.length) return <p style={{ margin: 0, color: MUTED }}>No email flows yet.</p>;
  const head = ["Flow", "People", "Waiting", "Emailed", "Opened", "Clicked", "Stopped"];
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead><tr>{head.map((h, i) => <th key={h} style={{ textAlign: i ? "right" : "left", padding: "4px 6px", color: MUTED, fontWeight: 600 }}>{h}</th>)}</tr></thead>
        <tbody>
          {flows.map((f) => (
            <tr key={f.id} style={{ borderTop: "1px solid #E4EAF2" }}>
              <td style={{ padding: "6px" }}><strong>{f.name}</strong>{f.status && f.status !== "active" ? <span style={{ color: MUTED }}> ({f.status})</span> : null}</td>
              {[f.people, f.waiting, f.emailed, f.opened, f.clicked, f.stopped].map((n, i) => <td key={i} style={{ padding: "6px", textAlign: "right" }}>{Number(n ?? 0).toLocaleString()}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
