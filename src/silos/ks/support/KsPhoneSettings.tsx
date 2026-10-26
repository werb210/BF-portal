// BF_PORTAL_v853_KS_PHONE_SUPPORT - Admin: the Keystone phone line (sales / support queues). Who rings for each queue
// (nobody ticked = everyone with Keystone access), how long it rings before voicemail, and the opening hours (outside
// them callers go straight to voicemail). Also shows whether the line is set up and the Twilio URL to use.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button, Field, input, KeyValues, linkStyle, PageTitle, Section } from "../ksUi";
import { apiErrorText, ksSupportApi, type KsPhoneInfo, type KsQueueSettings, type KsStaffMember, type KsWeekly } from "./ksSupportApi";
import { SUPPORT_BASE } from "./KsSupportQueue";

const DAYS: Array<{ key: keyof KsWeekly; label: string }> = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

function QueueForm({ value, staff }: { value: KsQueueSettings; staff: KsStaffMember[] }) {
  const [q, setQ] = useState<KsQueueSettings>(value);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const toggle = (id: string) =>
    setQ((x) => ({ ...x, ringUserIds: x.ringUserIds.includes(id) ? x.ringUserIds.filter((u) => u !== id) : [...x.ringUserIds, id] }));
  const setDay = (day: keyof KsWeekly, part: 0 | 1, v: string) =>
    setQ((x) => {
      const cur = x.weekly[day]?.[0] ?? ["08:00", "17:00"];
      const next: [string, string] = part === 0 ? [v, cur[1]] : [cur[0], v];
      return { ...x, weekly: { ...x.weekly, [day]: [next] } };
    });
  const setOpen = (day: keyof KsWeekly, open: boolean) =>
    setQ((x) => ({ ...x, weekly: { ...x.weekly, [day]: open ? [["08:00", "17:00"]] : [] } }));

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const r = await ksSupportApi.saveQueue(q.queue, {
        label: q.label, ringUserIds: q.ringUserIds, ringTimeoutSeconds: Number(q.ringTimeoutSeconds), hoursEnabled: q.hoursEnabled, timezone: q.timezone, weekly: q.weekly,
      });
      if (r?.queue) setQ(r.queue);
      setMsg({ ok: true, text: `${q.label} saved.` });
    } catch (e) {
      setMsg({ ok: false, text: apiErrorText(e, "Could not save.") });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section title={`${q.label} (press ${q.queue === "sales" ? "1" : "2"})`}>
      <div data-testid={`ks-queue-${q.queue}`}>
        <Field name="Who rings">
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", fontWeight: 400, color: "var(--ui-text)" }}>
            {staff.map((s) => (
              <label key={s.id} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input type="checkbox" aria-label={`${q.label}: ${s.name}`} checked={q.ringUserIds.includes(s.id)} onChange={() => toggle(s.id)} />
                {s.name}
              </label>
            ))}
          </div>
        </Field>
        <p style={{ color: "var(--ui-text-muted)", fontSize: 13, margin: "4px 0 12px" }}>
          {q.ringUserIds.length ? `${q.ringUserIds.length} selected.` : "Nobody ticked: everyone with Keystone access rings."} Only people signed in to the dialler or the portal, and not busy, ring.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <Field name="Ring for (seconds)">
            <input aria-label={`${q.label} ring seconds`} type="number" min={10} max={60} style={{ ...input, width: 110 }} value={q.ringTimeoutSeconds} onChange={(e) => setQ({ ...q, ringTimeoutSeconds: Number(e.target.value) })} />
          </Field>
          <Field name="Time zone">
            <input aria-label={`${q.label} time zone`} style={{ ...input, width: 200 }} value={q.timezone} onChange={(e) => setQ({ ...q, timezone: e.target.value })} />
          </Field>
          <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 14, color: "var(--ui-text)" }}>
            <input type="checkbox" aria-label={`${q.label} use opening hours`} checked={q.hoursEnabled} onChange={(e) => setQ({ ...q, hoursEnabled: e.target.checked })} />
            Use opening hours (off = open all the time)
          </label>
        </div>
        {q.hoursEnabled ? (
          <div style={{ display: "grid", gridTemplateColumns: "max-content max-content max-content max-content", gap: "6px 12px", alignItems: "center", marginBottom: 12 }}>
            {DAYS.map((d) => {
              const range = q.weekly[d.key]?.[0] ?? null;
              return (
                <div key={d.key} style={{ display: "contents" }}>
                  <span style={{ fontSize: 14 }}>{d.label}</span>
                  <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 14 }}>
                    <input type="checkbox" aria-label={`${q.label} open ${d.label}`} checked={Boolean(range)} onChange={(e) => setOpen(d.key, e.target.checked)} />
                    Open
                  </label>
                  <input aria-label={`${q.label} ${d.label} opens`} type="time" disabled={!range} style={input} value={range?.[0] ?? ""} onChange={(e) => setDay(d.key, 0, e.target.value)} />
                  <input aria-label={`${q.label} ${d.label} closes`} type="time" disabled={!range} style={input} value={range?.[1] ?? ""} onChange={(e) => setDay(d.key, 1, e.target.value)} />
                </div>
              );
            })}
          </div>
        ) : null}
        {msg ? <p role={msg.ok ? "status" : "alert"} style={{ color: msg.ok ? "var(--ui-text)" : "var(--ui-text-danger)" }}>{msg.text}</p> : null}
        <Button kind="primary" onClick={() => void save()} disabled={saving} testId={`ks-save-${q.queue}`}>{saving ? "Saving..." : `Save ${q.label.toLowerCase()}`}</Button>
      </div>
    </Section>
  );
}

export default function KsPhoneSettings() {
  const [info, setInfo] = useState<KsPhoneInfo | null>(null);
  const [staff, setStaff] = useState<KsStaffMember[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ksSupportApi.phone().then(setInfo).catch((e) => setError(apiErrorText(e, "Could not load the phone settings.")));
    ksSupportApi.staff().then(setStaff).catch(() => setStaff([]));
  }, []);

  return (
    <div style={{ padding: "16px 24px", maxWidth: 1000 }} data-testid="ks-phone-settings">
      <div style={{ marginBottom: 8 }}><Link to={SUPPORT_BASE} style={linkStyle}>Back to the queue</Link></div>
      <PageTitle>Keystone phone line</PageTitle>
      {error ? <p role="alert" style={{ color: "var(--ui-text-danger)" }}>{error}</p> : null}
      {info ? (
        <>
          <Section title="The line">
            <KeyValues
              rows={[
                ["Status", info.configured ? "On" : "Off - set KS_VOICE_NUMBER on BF-Server to turn it on"],
                ["Number", info.number ?? "-"],
                ["Twilio: a call comes in (webhook, POST)", info.voice_url],
                ["Twilio: call status changes (POST)", info.status_callback_url],
                ["Support replies are emailed from", info.support_email ?? "Not set (KS_SUPPORT_EMAIL)"],
              ]}
            />
            <p style={{ color: "var(--ui-text-muted)", fontSize: 13, margin: "8px 0 0" }}>
              Callers hear: &quot;Thanks for calling Keystone. Press 1 for sales, 2 for support.&quot; Support calls and voicemails open or
              update a support ticket. Voicemails are transcribed and filed on the caller&apos;s Keystone contact.
            </p>
          </Section>
          {info.queues.map((q) => <QueueForm key={`${q.queue}-${q.updatedAt ?? ""}`} value={q} staff={staff} />)}
        </>
      ) : !error ? <p style={{ color: "var(--ui-text-muted)" }}>Loading...</p> : null}
    </div>
  );
}
