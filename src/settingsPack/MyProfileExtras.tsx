// BF_PORTAL_v869_SETTINGS_PACK - My Profile additions for everyone: follow-up task defaults, away from
// lead rotation, and my signed-in devices. BF_PORTAL_v885_SETTINGS_ROLES - the "My booking link" box is gone: the Booking
// URL above (the website page) is the only booking link.
import { useEffect, useState } from "react";
import { api } from "@/api";
import { MySessions } from "./SecuritySettings";
import { MyQueueAvailability } from "@/callQueues/CallQueuesSettings"; // BF_PORTAL_v887_MY_QUEUE_SWITCH
import { Field, Notice, Section, Toggle, button, errText, input, muted } from "./ui";

type Defaults = { prompt_after_call: boolean; prompt_after_email: boolean; prompt_after_meeting: boolean; due_in_days: number; due_time: string; task_type: string; reminder_minutes: number | null };

export function FollowUpDefaults() {
  const [d, setD] = useState<Defaults | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  useEffect(() => { void api.get<{ defaults: Defaults }>("/api/task-defaults/me").then((r) => setD(r.defaults)).catch((e) => setErr(errText(e, "Could not load your follow-up defaults."))); }, []);
  if (!d) return err ? <Notice error={err} /> : null;
  const save = async () => {
    setErr(null); setOk(null);
    try { await api.put("/api/task-defaults/me", { defaults: d }); setOk("Follow-up defaults saved."); } catch (e) { setErr(errText(e, "Could not save.")); }
  };
  return (
    <Section id="my-followups" title="Follow-up tasks" intro="After you log a call, email or meeting, you're asked whether to create a follow-up, pre-filled with these defaults (weekends are skipped).">
      <Toggle id="fu-call" label="Ask after a call" checked={d.prompt_after_call} onChange={(v) => setD({ ...d, prompt_after_call: v })} />
      <Toggle id="fu-email" label="Ask after an email" checked={d.prompt_after_email} onChange={(v) => setD({ ...d, prompt_after_email: v })} />
      <Toggle id="fu-meeting" label="Ask after a meeting" checked={d.prompt_after_meeting} onChange={(v) => setD({ ...d, prompt_after_meeting: v })} />
      <Field id="fu-days" label="Due (days later)"><input id="fu-days" type="number" min={0} max={60} value={d.due_in_days} onChange={(e) => setD({ ...d, due_in_days: Number(e.target.value) })} style={{ ...input, width: 100 }} /></Field>
      <Field id="fu-time" label="Due time"><input id="fu-time" type="time" value={d.due_time} onChange={(e) => setD({ ...d, due_time: e.target.value })} style={{ ...input, width: 130 }} /></Field>
      <Field id="fu-type" label="Task type">
        <select id="fu-type" value={d.task_type} onChange={(e) => setD({ ...d, task_type: e.target.value })} style={{ ...input, width: 160 }}>
          <option value="CALL">Call</option><option value="EMAIL">Email</option><option value="SMS">Text</option><option value="TODO">To-do</option>
        </select>
      </Field>
      <Field id="fu-rem" label="Reminder">
        <select id="fu-rem" value={d.reminder_minutes === null ? "" : String(d.reminder_minutes)} onChange={(e) => setD({ ...d, reminder_minutes: e.target.value === "" ? null : Number(e.target.value) })} style={{ ...input, width: 200 }}>
          <option value="">No reminder</option><option value="0">At the due time</option><option value="15">15 minutes before</option><option value="60">1 hour before</option><option value="1440">1 day before</option>
        </select>
      </Field>
      <button type="button" style={button} onClick={() => void save()}>Save follow-up defaults</button>
      <Notice error={err} ok={ok} />
    </Section>
  );
}

export function MyLeadRotation() {
  const [me, setMe] = useState<{ enabled: boolean; member: boolean; away: boolean } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { void api.get<{ enabled: boolean; member: boolean; away: boolean }>("/api/lead-rotation/me").then(setMe).catch(() => setMe(null)); }, []);
  if (!me || !me.enabled || !me.member) return null;
  return (
    <Section id="my-rotation" title="New leads" intro="You're in the lead rotation. Mark yourself away (holidays, sick days) and new leads skip you.">
      <Toggle id="my-away" label="I'm away: don't give me new leads" checked={me.away} onChange={async (away) => {
        try { await api.put("/api/lead-rotation/me", { away }); setMe({ ...me, away }); } catch (e) { setErr(errText(e, "Could not change it.")); }
      }} />
      <Notice error={err} />
      <p style={muted}>{me.away ? "You're skipped until you switch this off." : "You're receiving new leads in turn."}</p>
    </Section>
  );
}

export default function MyProfileExtras() {
  return (
    <div data-testid="my-profile-extras">
      <FollowUpDefaults />
      <MyLeadRotation />
      <MyQueueAvailability compact />{/* BF_PORTAL_v887_MY_QUEUE_SWITCH - "available for queue calls" for everyone */}
      <MySessions />
    </div>
  );
}
