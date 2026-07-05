// BF_PORTAL_TASKS_M2_M3_v1 - the HubSpot-style "Start N tasks" focused
// step-through (Milestone 3). Run state is client-side over the ordered list
// from POST /api/tasks/runs. Every action binds STRICTLY to the current
// task's id - by construction this avoids HubSpot's documented cross-contact
// mis-completion bug. Complete advances; Skip advances without completing;
// Reschedule PATCHes due_at then advances; X exits (index refreshes).
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/api";
// BF_PORTAL_TASKS_M4_v1 - type-specific action surfaces: the runner reuses
// the REAL portal surfaces (Twilio dialer, O365 Graph composer, Twilio SMS
// composer) rather than mocks, resolving channel identity from the active
// silo like everywhere else.
import { openDialer } from "@/dialer/store";
import O365ComposeModal from "@/components/communications/O365ComposeModal";
import SMSComposer from "@/components/sms/SMSComposer";
import type { Contact } from "@/api/crm";

export type RunTask = {
  id: string; title: string; body: string | null; type: string; priority: string;
  due_at: string | null; queue_name: string | null;
  contact_id: string | null; contact_name: string | null;
  contact_phone: string | null; contact_email: string | null;
  company_name: string | null;
};

const box: React.CSSProperties = {
  background: "var(--ui-surface, #fff)", color: "var(--ui-text)", borderColor: "var(--ui-border)",
};

export default function TaskRunner({ tasks, onExit }: { tasks: RunTask[]; onExit: () => void }) {
  const [idx, setIdx] = useState(0);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [resched, setResched] = useState("");
  const [showList, setShowList] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // BF_PORTAL_TASKS_M4_v1 - composer state + the auto-open user setting
  // (spec A2: account/user setting to disable auto-open; stored per browser).
  const [emailOpen, setEmailOpen] = useState(false);
  const [smsOpen, setSmsOpen] = useState(false);
  const [completeAfterSend, setCompleteAfterSend] = useState(true);
  const [autoOpen, setAutoOpen] = useState(() => localStorage.getItem("boreal.tasks.autoOpen") !== "off");
  const toggleAutoOpen = () => {
    setAutoOpen((v) => {
      localStorage.setItem("boreal.tasks.autoOpen", v ? "off" : "on");
      return !v;
    });
  };

  const remaining = useMemo(() => tasks.filter((t) => !done[t.id]).length, [tasks, done]);
  const t = tasks[idx];
  const finished = remaining === 0 || !t;

  const advance = () => { setResched(""); setErr(null); setEmailOpen(false); setSmsOpen(false); setIdx((i) => Math.min(i + 1, tasks.length - 1)); };
  const back = () => { setResched(""); setErr(null); setEmailOpen(false); setSmsOpen(false); setIdx((i) => Math.max(i - 1, 0)); };

  // BF_PORTAL_TASKS_M4_v1 - auto-open the task type's action surface
  // (spec A2/A4): CALL pops the dialer, EMAIL the O365 composer, SMS the
  // Twilio composer. Only for the current open task, only when enabled.
  useEffect(() => {
    if (!autoOpen || !t || done[t.id]) return;
    if (t.type === "CALL" && t.contact_phone) {
      openDialer({ contactId: t.contact_id, contactName: t.contact_name, phone: t.contact_phone, source: "task_runner" });
    } else if (t.type === "EMAIL" && t.contact_email) {
      setEmailOpen(true);
    } else if (t.type === "SMS" && t.contact_phone) {
      setSmsOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  const complete = () => {
    if (!t) return;
    const id = t.id; // strict current-task binding
    api.post(`/api/tasks/${id}/complete`, {})
      .then(() => { setDone((p) => ({ ...p, [id]: true })); advance(); })
      .catch(() => setErr("Failed to complete."));
  };

  const reschedule = () => {
    if (!t || !resched) return;
    const id = t.id;
    api.patch(`/api/tasks/${id}`, { due_at: new Date(resched).toISOString() })
      .then(() => { setDone((p) => ({ ...p, [id]: true })); advance(); })
      .catch(() => setErr("Failed to reschedule."));
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center" }} data-testid="task-runner">
      <div className="border rounded-xl w-[720px] max-w-[95vw] max-h-[90vh] overflow-auto" style={box}>
        {/* Runner top bar */}
        <div className="flex items-center gap-2 border-b px-4 py-2" style={{ borderColor: "var(--ui-border)" }}>
          <strong>Task {Math.min(idx + 1, tasks.length)} of {tasks.length}</strong>
          <span style={{ color: "var(--ui-text-muted)" }}>({remaining} open)</span>
          <div className="ml-auto flex items-center gap-2">
            <button className="border rounded px-2 py-1 text-sm" style={box} onClick={back} disabled={idx === 0} aria-label="Previous task">&lt;</button>
            <button className="border rounded px-2 py-1 text-sm" style={box} onClick={advance} disabled={idx >= tasks.length - 1} aria-label="Skip to next task">Skip &gt;</button>
            <button className="border rounded px-2 py-1 text-sm" style={box} onClick={() => setShowList((v) => !v)}>List</button>
            <button className="border rounded px-2 py-1 text-sm" style={box} onClick={toggleAutoOpen} title="Auto-open the call/email/SMS surface for each task">
              Auto-open: {autoOpen ? "On" : "Off"}
            </button>
            <button className="border rounded px-2 py-1 text-sm font-semibold" style={box} onClick={onExit} aria-label="Exit runner">X</button>
          </div>
        </div>

        {showList && (
          <div className="border-b px-4 py-2 max-h-40 overflow-auto text-sm" style={{ borderColor: "var(--ui-border)" }}>
            {tasks.map((x, i) => (
              <div key={x.id} className="flex gap-2 py-0.5" style={{ color: done[x.id] ? "var(--ui-text-muted)" : "var(--ui-text)", fontWeight: i === idx ? 700 : 400 }}>
                <span>{done[x.id] ? "[done]" : "[open]"}</span>
                <button className="text-left underline" onClick={() => { setIdx(i); setShowList(false); }}>{x.title}</button>
              </div>
            ))}
          </div>
        )}

        {finished ? (
          <div className="p-8 text-center">
            <h2 className="text-xl font-semibold mb-2">All tasks done</h2>
            <p style={{ color: "var(--ui-text-muted)" }}>You worked through this run. Nice.</p>
            <button className="border rounded px-4 py-2 mt-4 font-semibold" style={box} onClick={onExit}>Back to tasks</button>
          </div>
        ) : (
          <div className="p-4">
            <div className="text-xs uppercase tracking-wide" style={{ color: "var(--ui-text-muted)" }}>
              {t.type} {t.priority !== "NONE" ? `- ${t.priority}` : ""} {t.queue_name ? `- ${t.queue_name}` : ""}
            </div>
            <h2 className="text-lg font-semibold mt-1">{t.title}</h2>
            <div className="text-sm mt-1" style={{ color: "var(--ui-text-muted)" }}>
              Due: {t.due_at ? new Date(t.due_at).toLocaleString() : "no due date"}
              {done[t.id] ? " - completed in this run" : ""}
            </div>
            {t.body && <p className="mt-3 text-sm whitespace-pre-wrap">{t.body}</p>}

            {(t.contact_name || t.company_name) && (
              <div className="border rounded-lg p-3 mt-4 text-sm" style={{ borderColor: "var(--ui-border)" }}>
                <div className="font-semibold">{t.contact_name ?? "-"}{t.company_name ? ` - ${t.company_name}` : ""}</div>
                <div className="flex gap-4 mt-1" style={{ color: "var(--ui-text-muted)" }}>
                  {t.contact_phone && <a href={`tel:${t.contact_phone}`} className="underline">{t.contact_phone}</a>}
                  {t.contact_email && <a href={`mailto:${t.contact_email}`} className="underline">{t.contact_email}</a>}
                  {t.contact_id && <Link to={`/crm/contacts/${t.contact_id}`} className="underline">Open contact -&gt;</Link>}
                </div>
              </div>
            )}

            {err && <p role="alert" style={{ color: "#dc2626" }}>{err}</p>}

            {/* BF_PORTAL_TASKS_M4_v1 - type-specific action buttons */}
            <div className="flex items-center gap-2 mt-5 flex-wrap">
              {t.type === "CALL" && t.contact_phone && (
                <button className="border rounded px-3 py-2 text-sm font-semibold" style={box}
                  onClick={() => openDialer({ contactId: t.contact_id, contactName: t.contact_name, phone: t.contact_phone, source: "task_runner" })}>
                  Open dialer
                </button>
              )}
              {t.type === "EMAIL" && t.contact_email && (
                <button className="border rounded px-3 py-2 text-sm font-semibold" style={box} onClick={() => setEmailOpen(true)}>
                  Write email
                </button>
              )}
              {t.type === "SMS" && t.contact_phone && (
                <button className="border rounded px-3 py-2 text-sm font-semibold" style={box} onClick={() => setSmsOpen(true)}>
                  Send SMS
                </button>
              )}
              {t.type === "EMAIL" && (
                <label className="flex items-center gap-1 text-sm" style={{ color: "var(--ui-text-muted)" }}>
                  <input type="checkbox" checked={completeAfterSend} onChange={(e) => setCompleteAfterSend(e.target.checked)} />
                  Complete after send
                </label>
              )}
              <button className="border rounded px-4 py-2 font-semibold" style={box} onClick={complete} disabled={!!done[t.id]}>
                Complete
              </button>
              <input type="datetime-local" value={resched} onChange={(e) => setResched(e.target.value)} className="border rounded px-2 py-1 text-sm" style={box} aria-label="Reschedule to" />
              <button className="border rounded px-3 py-2 text-sm" style={box} onClick={reschedule} disabled={!resched}>Reschedule</button>
            </div>
          </div>
        )}
      </div>

      {/* BF_PORTAL_TASKS_M4_v1 - EMAIL: O365 Graph composer prefilled to the
          contact, logged to the contact timeline; "Send & complete" via the
          checkbox (onSent). SMS: Twilio composer; it exposes no sent
          callback, so the rep completes manually after sending. */}
      {t && (
        <O365ComposeModal
          open={emailOpen}
          initialTo={t.contact_email ?? ""}
          initialSubject={t.title}
          recipientName={t.contact_name ?? undefined}
          logScope={t.contact_id ? { kind: "contact", id: t.contact_id } : undefined}
          onClose={() => setEmailOpen(false)}
          onSent={() => { setEmailOpen(false); if (completeAfterSend) complete(); }}
        />
      )}
      {t && smsOpen && t.contact_id && (
        <SMSComposer
          visible={smsOpen}
          contact={{ id: t.contact_id, name: t.contact_name ?? "", phone: t.contact_phone ?? "", email: t.contact_email ?? "" } as Contact}
          onClose={() => setSmsOpen(false)}
        />
      )}
    </div>
  );
}
