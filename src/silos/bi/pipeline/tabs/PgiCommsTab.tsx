// BF_PORTAL_BLOCK_BI_ROUND8_DETAIL_v1 -- PGI Comms tab.
// All carrier-side correspondence in one place: outbound submission
// payload, every webhook event, current quote / decline / info
// required prompts, raw request/response logs.
import { useEffect, useState } from "react";
import { api } from "@/api";
import type { BiApplicationDetailData } from "../BIApplicationDetail";

type PgiEvent = {
  id: string;
  event_type: string;
  occurred_at: string;
  payload: Record<string, unknown>;
};

export default function PgiCommsTab({ app }: { app: BiApplicationDetailData }) {
  const [events, setEvents] = useState<PgiEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await api<{ events: PgiEvent[] }>(`/api/v1/bi/applications/${app.id}/pgi-comms`);
        if (cancelled) return;
        setEvents(r.events || []);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load PGI events");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [app.id]);

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-card bg-brand-bgAlt p-4">
        <h3 className="mb-3 text-sm font-semibold">Carrier state</h3>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <dt className="text-white/50">PGI application ID</dt>
          <dd className="font-mono text-white/80">{app.pgi_application_id || "—"}</dd>
          <dt className="text-white/50">Last event</dt>
          <dd className="text-white/80">{app.carrier_last_event || "—"} {app.carrier_last_event_at ? `at ${new Date(app.carrier_last_event_at).toLocaleString()}` : ""}</dd>
          <dt className="text-white/50">Quote ID</dt>
          <dd className="font-mono text-white/80">{app.quote_id || "—"}</dd>
          <dt className="text-white/50">Underwriter ref</dt>
          <dd className="text-white/80">{app.underwriter_ref || "—"}</dd>
          <dt className="text-white/50">Annual premium</dt>
          <dd className="text-white/80">{app.annual_premium ? `$${app.annual_premium}` : "—"}</dd>
          <dt className="text-white/50">Quote valid until</dt>
          <dd className="text-white/80">{app.quote_valid_until ? new Date(app.quote_valid_until).toLocaleString() : "—"}</dd>
          <dt className="text-white/50">Policy ID</dt>
          <dd className="font-mono text-white/80">{app.policy_id || "—"}</dd>
          <dt className="text-white/50">Policy bound at</dt>
          <dd className="text-white/80">{app.policy_bound_at ? new Date(app.policy_bound_at).toLocaleString() : "—"}</dd>
          {app.score_reason && (<><dt className="text-white/50">Decline reason</dt><dd className="italic text-rose-200/80">{app.score_reason}</dd></>)}
          {app.carrier_submission_error && (<><dt className="text-white/50">Submission error</dt><dd className="italic text-rose-200/80">{app.carrier_submission_error}</dd></>)}
        </dl>
      </section>

      {app.carrier_submission_request && (
        <details className="rounded-xl border border-card bg-brand-bgAlt p-4">
          <summary className="cursor-pointer text-sm font-semibold">Submission payload (sent to PGI)</summary>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap font-mono text-[11px] text-white/70">{JSON.stringify(app.carrier_submission_request, null, 2)}</pre>
        </details>
      )}
      {app.carrier_submission_response && (
        <details className="rounded-xl border border-card bg-brand-bgAlt p-4">
          <summary className="cursor-pointer text-sm font-semibold">Submission response (from PGI)</summary>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap font-mono text-[11px] text-white/70">{JSON.stringify(app.carrier_submission_response, null, 2)}</pre>
        </details>
      )}

      <section className="rounded-xl border border-card bg-brand-bgAlt p-4">
        <h3 className="mb-3 text-sm font-semibold">Webhook events</h3>
        {error && <p className="text-sm text-red-300">{error}</p>}
        {!events && !error && <p className="text-sm text-white/60">Loading…</p>}
        {events && events.length === 0 && <p className="text-sm italic text-white/50">No carrier webhooks received yet.</p>}
        {events && events.length > 0 && (
          <ol className="space-y-3">
            {events.map((ev) => (
              <li key={ev.id} className="rounded-lg border border-card bg-brand-surface p-3">
                <div className="flex items-center justify-between">
                  <strong className="font-mono text-xs text-purple-200">{ev.event_type}</strong>
                  <span className="text-[10px] text-white/40">{new Date(ev.occurred_at).toLocaleString()}</span>
                </div>
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-white/60 hover:text-white">Payload</summary>
                  <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-[11px] text-white/70">{JSON.stringify(ev.payload, null, 2)}</pre>
                </details>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
