import { useEffect, useState, type CSSProperties } from "react";
import { crmApi, type Scope, type TimelineItem } from "@/api/crm";

type FilterTab = "all" | "note" | "email" | "call" | "task" | "meeting";

// BF_PORTAL_BLOCK_v699_BI_CARD_PARITY_v1 — `items` makes this a controlled
// component: when a caller supplies its own already-fetched events (e.g. the
// BI contact card, whose feed is merged from BI-Server + BF-Server), the
// internal fetch is skipped entirely. BF callers pass scope/refreshKey and
// behave exactly as before.
export function ActivityTimeline({ scope, refreshKey, items: itemsProp }: {
  scope?: Scope; refreshKey?: number; items?: TimelineItem[];
}): JSX.Element {
  const controlled = itemsProp !== undefined;
  const [fetchedItems, setFetchedItems] = useState<TimelineItem[]>([]);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (controlled || !scope) return;
    let cancelled = false;
    setLoading(true);
    setErr(null);
    (async () => {
      try {
        const r = await crmApi.timeline(scope);
        if (!cancelled) setFetchedItems(Array.isArray(r) ? r : []);
      } catch (e) {
        if (!cancelled) setErr((e as Error)?.message ?? "Could not load activity.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [controlled, scope?.kind, scope?.id, refreshKey]);

  const items = controlled ? (itemsProp as TimelineItem[]) : fetchedItems;
  const filtered = filter === "all" ? items : items.filter(i => i.kind === filter);

  return (
    <div style={container}>
      <div style={tabs}>
        <Tab id="all" label="All activities" current={filter} onClick={setFilter} />
        <Tab id="note" label="Notes" current={filter} onClick={setFilter} />
        <Tab id="email" label="Emails" current={filter} onClick={setFilter} />
        <Tab id="call" label="Calls" current={filter} onClick={setFilter} />
        <Tab id="task" label="Tasks" current={filter} onClick={setFilter} />
        <Tab id="meeting" label="Meetings" current={filter} onClick={setFilter} />
      </div>

      {loading && <div style={empty}>Loading…</div>}
      {err && <div style={{ ...empty, color: "#b00020" }}>{err}</div>}
      {!loading && !err && filtered.length === 0 && <div style={empty}>No activity yet.</div>}

      {filtered.map(item => (
        <article key={`${item.kind}-${item.id}`} style={card}>
          <header style={cardHeader}>
            <span style={kindBadge(item.kind)}>{item.kind}</span>
            <time style={ts}>{new Date(item.ts).toLocaleString()}</time>
          </header>
          {item.title && <div style={{ fontWeight: 500, color: "var(--ui-text)" }}>{item.title}</div>}
          {item.body && <div style={{ color: "var(--ui-text-muted)", marginTop: 4, whiteSpace: "pre-wrap" }}>{item.body}</div>}
          {item.extra && <div style={extra}>{item.extra}</div>}
        </article>
      ))}
    </div>
  );
}

function Tab({ id, label, current, onClick }: {
  id: FilterTab; label: string; current: FilterTab; onClick: (v: FilterTab) => void;
}): JSX.Element {
  const active = current === id;
  return (
    <button onClick={() => onClick(id)} style={{
      background: "none", border: "none", padding: "8px 0", cursor: "pointer",
      color: active ? "#0091ae" : "#33475b",
      borderBottom: active ? "2px solid #0091ae" : "2px solid transparent",
      fontWeight: active ? 600 : 400,
    }}>{label}</button>
  );
}

const container: CSSProperties = { background: "var(--ui-surface-muted)", borderRadius: 6, padding: 16 };
const tabs: CSSProperties = { display: "flex", gap: 16, borderBottom: "1px solid var(--ui-border)", marginBottom: 16 };
const empty: CSSProperties = { color: "var(--ui-text-muted)", textAlign: "center", padding: 32 };
const card: CSSProperties = {
  background: "var(--ui-surface-strong)", borderRadius: 4, padding: 12, marginBottom: 8, border: "1px solid var(--ui-border-soft)",
};
const cardHeader: CSSProperties = { display: "flex", justifyContent: "space-between", marginBottom: 4 };
const ts: CSSProperties = { color: "var(--ui-text-muted)", fontSize: 12 };
const extra: CSSProperties = { color: "var(--ui-text-muted)", fontSize: 12, marginTop: 4 };

function kindBadge(kind: TimelineItem["kind"]): CSSProperties {
  const palette: Record<TimelineItem["kind"], { bg: string; fg: string }> = {
    note: { bg: "#fff8e1", fg: "#5b4900" },
    task: { bg: "#e8eaf6", fg: "#1a237e" },
    call: { bg: "#e3f2fd", fg: "#0d47a1" },
    email: { bg: "#e8f5e9", fg: "#1b5e20" },
    meeting: { bg: "#fce4ec", fg: "#880e4f" },
  };
  const c = palette[kind];
  return {
    display: "inline-block", padding: "2px 8px", borderRadius: 12,
    background: c?.bg ?? "transparent", color: c?.fg ?? "inherit", fontSize: 11, fontWeight: 600, textTransform: "uppercase",
  };
}
