// BF_PORTAL_BLOCK_BI_ROUND8_DETAIL_v1 -- Requirement History tab.
// Full audit log of every document event: upload, accept, reject,
// re-upload, OCR-complete, carrier-forwarded.
import { useEffect, useState } from "react";
import { api } from "@/api";

type Event = {
  id: string;
  occurred_at: string;
  actor: string;
  event_type: string;
  document_filename?: string | null;
  category?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
};

export default function RequirementHistoryTab({ applicationId }: { applicationId: string }) {
  const [events, setEvents] = useState<Event[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await api<{ events: Event[] }>(`/api/v1/bi/applications/${applicationId}/document-history`);
        if (cancelled) return;
        setEvents(r.events || []);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load history");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applicationId]);

  if (error) return <p className="text-sm text-red-300">{error}</p>;
  if (!events) return <p className="text-sm text-white/60">Loading history…</p>;
  if (events.length === 0) return <p className="text-sm italic text-white/50">No document events yet.</p>;

  return (
    <ol className="relative space-y-4 border-l border-white/10 pl-5">
      {events.map((e) => (
        <li key={e.id} className="relative">
          <span className="absolute -left-[7px] top-1 h-3 w-3 rounded-full border border-blue-300 bg-blue-400/60" />
          <div className="text-xs text-white/40">{new Date(e.occurred_at).toLocaleString()}</div>
          <div className="text-sm text-white">
            <strong>{e.actor}</strong> {e.event_type.replace(/_/g, " ")}
            {e.document_filename && <span className="text-white/60"> — {e.document_filename}</span>}
            {e.category && <span className="ml-2 text-xs text-white/40">({e.category})</span>}
          </div>
          {e.reason && <div className="text-xs italic text-rose-200/80">{e.reason}</div>}
        </li>
      ))}
    </ol>
  );
}
