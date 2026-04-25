import { useEffect, useState, type CSSProperties } from "react";
import { crmApi, type Scope, type TimelineItem } from "@/api/crm";

type FilterTab = "all" | "note" | "email" | "call" | "task" | "meeting";

export function ActivityTimeline({ scope, refreshKey }: {
  scope: Scope; refreshKey: number;
}): JSX.Element {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    (async () => {
      try {
        const r = await crmApi.timeline(scope);
        if (!cancelled) setItems(Array.isArray(r) ? r : []);
      } catch (e) {
        if (!cancelled) setErr((e as Error)?.message ?? "Could not load activity.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [scope.kind, scope.id, refreshKey]);

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
          {item.title && <div style={{ fontWeight: 500, color: "#000" }}>{item.title}</div>}
          {item.body && <div style={{ color: "#33475b", marginTop: 4, whiteSpace: "pre-wrap" }}>{item.body}</div>}
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

const container: CSSProperties = { background: "#f5f8fa", borderRadius: 6, padding: 16 };
const tabs: CSSProperties = { display: "flex", gap: 16, borderBottom: "1px solid #cbd6e2", marginBottom: 16 };
const empty: CSSProperties = { color: "#7c98b6", textAlign: "center", padding: 32 };
const card: CSSProperties = {
  background: "#fff", borderRadius: 4, padding: 12, marginBottom: 8, border: "1px solid #eaf0f6",
};
const cardHeader: CSSProperties = { display: "flex", justifyContent: "space-between", marginBottom: 4 };
const ts: CSSProperties = { color: "#7c98b6", fontSize: 12 };
const extra: CSSProperties = { color: "#7c98b6", fontSize: 12, marginTop: 4 };

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
    background: c.bg, color: c.fg, fontSize: 11, fontWeight: 600, textTransform: "uppercase",
  };
}
