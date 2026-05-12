// BF_PORTAL_BLOCK_v193_BI_SILO_ALIGN_v1
// Carrier visibility tab. Replaces the v57 raw JSON dump with a
// structured view backed by:
//   * the carrier_* columns on bi_applications (received_at, last_event,
//     last_event_at, pgi_application_id, submission_request/response/error)
//   * the bi_activity event stream filtered to carrier-related events
//
// Staff use this to verify a submission actually reached the carrier,
// see when each webhook arrived, and (for debugging) inspect the raw
// request/response bodies the server stored.
import { useCallback, useEffect, useState } from "react";
import { api } from "@/api";
import type { BiApplicationDetailData } from "../BIApplicationDetail";

type ActivityRow = {
  id: string;
  application_id: string;
  actor_type: string;
  event_type: string;
  summary: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
};

// Carrier event types written by pgiWebhookRoutes + biLenderApplicationCreate.
const CARRIER_EVENTS = new Set([
  "carrier_received",
  "carrier_webhook",
  "carrier_submission_started",
  "carrier_submission_failed",
  "carrier_event",
  "pgi_submitted",
  "pgi_webhook",
]);

function fmt(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso;
  return d.toLocaleString();
}

function relativeFromNow(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return iso;
  const seconds = Math.floor((Date.now() - t) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function InsurerResponseTab({ app }: { app: BiApplicationDetailData }) {
  const [events, setEvents] = useState<ActivityRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api<{ activity: ActivityRow[] } | ActivityRow[]>(
        `/api/v1/bi/applications/${app.id}/activity`,
      );
      const list = Array.isArray(r) ? r : r.activity || [];
      setEvents(list.filter((e) => CARRIER_EVENTS.has(e.event_type)));
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load activity");
    }
  }, [app.id]);

  useEffect(() => { void load(); }, [load]);

  const carrierReceivedAt   = (app as any).carrier_received_at as string | null | undefined;
  const carrierLastEvent    = (app as any).carrier_last_event as string | null | undefined;
  const carrierLastEventAt  = (app as any).carrier_last_event_at as string | null | undefined;
  const pgiApplicationId    = (app as any).pgi_application_id as string | null | undefined;
  const submissionRequest   = (app as any).carrier_submission_request as Record<string, unknown> | null | undefined;
  const submissionResponse  = (app as any).carrier_submission_response as Record<string, unknown> | null | undefined;
  const submissionError     = (app as any).carrier_submission_error as string | null | undefined;

  const isStub = typeof pgiApplicationId === "string" && pgiApplicationId.startsWith("STUB_APP_DEMO_");

  return (
    <div className="space-y-6 text-white">
      {/* Carrier status header */}
      <section className="rounded-xl border border-card bg-brand-surface p-4">
        <div className="text-xs uppercase tracking-widest text-white/60">Carrier status</div>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <div className="text-xs text-white/60">Received by carrier</div>
            <div className="text-sm">
              {carrierReceivedAt
                ? <>{fmt(carrierReceivedAt)} <span className="text-white/50">({relativeFromNow(carrierReceivedAt)})</span></>
                : <span className="text-white/40">Not yet submitted</span>}
            </div>
          </div>
          <div>
            <div className="text-xs text-white/60">Last event</div>
            <div className="text-sm">
              {carrierLastEvent
                ? <><span className="rounded bg-blue-500/20 px-2 py-0.5 text-xs text-blue-200">{carrierLastEvent}</span> <span className="text-white/50 ml-2">{relativeFromNow(carrierLastEventAt)}</span></>
                : <span className="text-white/40">—</span>}
            </div>
          </div>
          <div>
            <div className="text-xs text-white/60">PGI application id</div>
            <div className="text-sm font-mono">
              {pgiApplicationId
                ? <>
                    {pgiApplicationId}
                    {isStub && <span className="ml-2 rounded bg-amber-500/20 px-2 py-0.5 text-xs text-amber-200">DEMO STUB</span>}
                  </>
                : <span className="text-white/40">—</span>}
            </div>
          </div>
          <div>
            <div className="text-xs text-white/60">Last error</div>
            <div className="text-sm">
              {submissionError
                ? <span className="text-red-300">{submissionError}</span>
                : <span className="text-white/40">None</span>}
            </div>
          </div>
        </div>
      </section>

      {/* Event timeline */}
      <section className="rounded-xl border border-card bg-brand-surface p-4">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-widest text-white/60">Event timeline</div>
          <button onClick={() => void load()} className="text-xs text-white/60 hover:text-white">Refresh</button>
        </div>
        {err && <div className="mt-3 rounded border border-red-500/40 bg-red-500/10 p-2 text-sm text-red-200">{err}</div>}
        {events === null && !err && <div className="mt-3 text-sm text-white/50">Loading…</div>}
        {events && events.length === 0 && (
          <div className="mt-3 text-sm text-white/40">No carrier events yet. Once the application is forwarded, every webhook from the carrier will appear here.</div>
        )}
        {events && events.length > 0 && (
          <ol className="mt-3 space-y-2">
            {events.map((e) => (
              <li key={e.id} className="rounded border border-white/10 bg-black/20 p-3 text-sm">
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <span className="rounded bg-blue-500/20 px-2 py-0.5 text-xs text-blue-200">{e.event_type}</span>
                  <span className="text-xs text-white/50">{fmt(e.created_at)} · {relativeFromNow(e.created_at)}</span>
                </div>
                {e.summary && <div className="mt-1 text-white/80">{e.summary}</div>}
                {e.meta && Object.keys(e.meta).length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-white/50 hover:text-white">meta</summary>
                    <pre className="mt-1 overflow-auto rounded bg-black/40 p-2 text-[10px]">{JSON.stringify(e.meta, null, 2)}</pre>
                  </details>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Debug — raw payloads */}
      {(submissionRequest || submissionResponse) && (
        <section className="rounded-xl border border-card bg-brand-surface p-4">
          <button
            onClick={() => setShowRaw((v) => !v)}
            className="flex w-full items-center justify-between text-xs uppercase tracking-widest text-white/60 hover:text-white"
          >
            <span>Raw submission payloads (debug)</span>
            <span>{showRaw ? "▾" : "▸"}</span>
          </button>
          {showRaw && (
            <div className="mt-3 space-y-3">
              {submissionRequest && (
                <div>
                  <div className="text-xs text-white/60 mb-1">Request body sent to carrier</div>
                  <pre className="overflow-auto rounded bg-black/40 p-2 text-[10px] max-h-64">{JSON.stringify(submissionRequest, null, 2)}</pre>
                </div>
              )}
              {submissionResponse && (
                <div>
                  <div className="text-xs text-white/60 mb-1">Response body from carrier</div>
                  <pre className="overflow-auto rounded bg-black/40 p-2 text-[10px] max-h-64">{JSON.stringify(submissionResponse, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
