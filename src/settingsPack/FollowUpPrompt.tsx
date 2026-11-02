// BF_PORTAL_v869_SETTINGS_PACK_TASK_DEFAULTS - "Create a follow-up?" after a call, email or meeting is logged. Callers
// fire requestFollowUp(); the prompt (mounted once in the layout) asks the server for the person's defaults and, when
// they have the prompt on, shows the pre-filled task. Creating it goes through POST /api/tasks.
import { useEffect, useState } from "react";
import { api } from "@/api";
import { getActiveSilo } from "@/config/api";
import { Field, Notice, button, card, errText, h3, input, muted, quiet } from "./ui";

export type FollowUpAfter = "call" | "email" | "meeting";
const EVENT = "ks:follow-up";

export function requestFollowUp(after: FollowUpAfter, contactId: string | null | undefined): void {
  if (!contactId || typeof window === "undefined") return;
  // BF_PORTAL_v869_SETTINGS_PACK - BI contacts live in BI-Server; follow-up tasks here are for BF and SLF contacts.
  if (String(getActiveSilo() ?? "").toUpperCase() === "BI") return;
  try { window.dispatchEvent(new CustomEvent(EVENT, { detail: { after, contactId } })); } catch { /* old browsers: no prompt */ }
}

type Suggestion = { prompt: boolean; title: string; type: string; due_at: string; reminder_at: string | null; contact_id: string | null };

const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function FollowUpPrompt() {
  const [s, setS] = useState<Suggestion | null>(null);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent).detail as { after: FollowUpAfter; contactId: string };
      void api.get<Suggestion>(`/api/task-defaults/suggestion?after=${d.after}&contact_id=${encodeURIComponent(d.contactId)}`).then((r) => {
        if (!r.prompt) return;
        setS(r); setTitle(r.title); setDue(toLocalInput(r.due_at)); setErr(null); setOk(null);
      }).catch(() => undefined);
    };
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);

  if (!s) return null;
  const create = async () => {
    setErr(null);
    try {
      const dueAt = new Date(due);
      const shift = dueAt.getTime() - new Date(s.due_at).getTime();
      await api.post("/api/tasks", {
        title, type: s.type, contact_id: s.contact_id, due_at: dueAt.toISOString(),
        reminder_at: s.reminder_at ? new Date(new Date(s.reminder_at).getTime() + shift).toISOString() : null,
      });
      setOk("Follow-up created.");
      setTimeout(() => setS(null), 900);
    } catch (e) { setErr(errText(e, "Could not create the task.")); }
  };
  return (
    <div role="dialog" aria-modal="false" aria-labelledby="fu-h" data-testid="follow-up-prompt"
      style={{ ...card, position: "fixed", right: 16, bottom: 16, zIndex: 1000, width: "min(380px, calc(100vw - 32px))", boxShadow: "0 8px 24px rgba(0,0,0,0.25)" }}>
      <h3 id="fu-h" style={h3}>Create a follow-up?</h3>
      <p style={muted}>Your defaults are set under My Profile.</p>
      <Field id="fu-title" label="Task"><input id="fu-title" value={title} onChange={(e) => setTitle(e.target.value)} style={input} /></Field>
      <Field id="fu-due" label="Due"><input id="fu-due" type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} style={input} /></Field>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" style={button} disabled={!title.trim() || !due} onClick={() => void create()}>Create task</button>
        <button type="button" style={quiet} onClick={() => setS(null)}>No thanks</button>
      </div>
      <Notice error={err} ok={ok} />
    </div>
  );
}
