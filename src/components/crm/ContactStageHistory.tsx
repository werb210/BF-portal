// BF_PORTAL_CONTACT_STAGE_HISTORY_v1 - stage-change audit trail on the contact record.
import { useEffect, useState, type CSSProperties } from "react";
import { api } from "@/api";

type StageEvent = { id: string; application_id: string; from_stage: string | null; to_stage: string; trigger?: string | null; triggered_by?: string | null; created_at: string };

export function ContactStageHistory({ contactId }: { contactId: string }) {
  const [events, setEvents] = useState<StageEvent[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await api.get<StageEvent[] | { data?: StageEvent[] }>(`/api/crm/contacts/${encodeURIComponent(contactId)}/stage-events`);
        const list = Array.isArray(r) ? r : (r?.data ?? []);
        if (!cancelled) setEvents(Array.isArray(list) ? list : []);
      } catch { if (!cancelled) setEvents([]); }
      finally { if (!cancelled) setLoaded(true); }
    })();
    return () => { cancelled = true; };
  }, [contactId]);

  if (!loaded || events.length === 0) return null;

  const row: CSSProperties = { fontSize: 13, padding: "6px 0", borderTop: "1px solid var(--ui-border)", display: "flex", justifyContent: "space-between", gap: 8 };

  return (
    <section style={{ marginTop: 16, border: "1px solid var(--ui-border-soft)", borderRadius: 6, padding: 16 }}>
      <strong>Stage history</strong>
      <div style={{ marginTop: 8 }}>
        {events.map((e) => (
          <div key={e.id} style={row}>
            <span>{e.from_stage ? `${e.from_stage} → ` : ""}<strong>{e.to_stage}</strong>{e.trigger ? <span style={{ color: "var(--ui-text-muted)" }}> · {e.trigger}</span> : null}</span>
            <span style={{ color: "var(--ui-text-muted)", whiteSpace: "nowrap" }}>{new Date(e.created_at).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default ContactStageHistory;
