import { useEffect, useState, type CSSProperties } from "react";
import { crmApi, type Scope, type TimelineItem } from "@/api/crm";

export function ActivityTimeline({ scope, refreshKey = 0 }: { scope: Scope; refreshKey?: number }) {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const rows = await crmApi.timeline(scope);
        if (!cancelled) setItems(Array.isArray(rows) ? rows : []);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [scope, refreshKey]);

  if (loading) return <div style={panel}>Loading activity…</div>;
  if (items.length === 0) return <div style={panel}>No activity yet.</div>;

  return (
    <div style={panel}>
      {items.map((item) => (
        <div key={item.id} style={row}>
          <div style={kind}>{item.kind.toUpperCase()}</div>
          <div style={{ fontWeight: 600 }}>{item.title || "(untitled)"}</div>
          {item.body && <div>{item.body}</div>}
          {item.ts && <div style={meta}>{new Date(item.ts).toLocaleString()}</div>}
        </div>
      ))}
    </div>
  );
}

const panel: CSSProperties = {
  background: "#fff",
  border: "1px solid #eaf0f6",
  borderRadius: 6,
  padding: 16,
};

const row: CSSProperties = {
  borderBottom: "1px solid #eaf0f6",
  paddingBottom: 12,
  marginBottom: 12,
};

const kind: CSSProperties = {
  color: "#516f90",
  fontSize: 11,
  textTransform: "uppercase",
  marginBottom: 4,
};

const meta: CSSProperties = {
  color: "#7c98b6",
  fontSize: 12,
  marginTop: 4,
};
