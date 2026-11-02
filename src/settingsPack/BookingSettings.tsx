// BF_PORTAL_v869_SETTINGS_PACK_BOOKING - Settings > Booking pages (Admins): everyone's public booking link and the team
// round-robin link, meeting types, booking hours, reminders. BF-Server /api/booking-settings.
import { useCallback, useEffect, useState } from "react";
import { api } from "@/api";
import { DAY_LABELS, Field, Notice, Section, Toggle, button, cell, copyText, danger, errText, input, muted, quiet } from "./ui";

type MeetingType = { id: string; slug: string; name: string; description: string | null; duration_min: number; kind: "phone" | "video"; buffer_min: number; min_notice_min: number; max_days_ahead: number; active: boolean; sort: number };
type Settings = { team_page: boolean; hours: Record<string, Array<[string, string]>>; reminders: { email_24h: boolean; email_1h: boolean; sms_24h: boolean; sms_1h: boolean }; confirmation_note: string };
type Links = { team: string; staff: Array<{ user_id: string; name: string; url: string }> };
type Loaded = { settings: Settings; meeting_types: MeetingType[]; links: Links; time_zone: string; zone_label: string };

const BLANK = { name: "", duration_min: 30, kind: "phone" as const, buffer_min: 0, min_notice_min: 120, max_days_ahead: 14, description: "" };

export function LinkRow({ label, url }: { label: string; url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", margin: "4px 0" }}>
      <span style={{ fontSize: 13, minWidth: 140 }}>{label}</span>
      <a href={url} target="_blank" rel="noreferrer" style={{ color: "var(--ui-link, #1d4ed8)", fontSize: 13, wordBreak: "break-all" }}>{url}</a>
      <button type="button" style={quiet} onClick={async () => setCopied(await copyText(url))}>{copied ? "Copied" : "Copy"}</button>
    </div>
  );
}

export default function BookingSettings() {
  const [data, setData] = useState<Loaded | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [draft, setDraft] = useState(BLANK);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { const r = await api.get<Loaded>("/api/booking-settings"); setData(r); setSettings(r.settings); }
    catch (e) { setErr(errText(e, "Could not load the booking settings.")); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  if (!data || !settings) return <div data-testid="booking-settings"><Notice error={err} />{!err && <p style={muted}>Loading...</p>}</div>;

  const saveSettings = async () => {
    setErr(null); setOk(null);
    try { await api.put("/api/booking-settings", { settings }); setOk("Booking settings saved."); } catch (e) { setErr(errText(e, "Could not save.")); }
  };
  const addType = async () => {
    setErr(null); setOk(null);
    try { await api.post("/api/booking-settings/meeting-types", draft); setDraft(BLANK); setOk("Meeting type added."); await load(); }
    catch (e) { setErr(errText(e, "Could not add the meeting type.")); }
  };
  const toggleType = async (t: MeetingType) => {
    try { await api.put(`/api/booking-settings/meeting-types/${t.id}`, { ...t, active: !t.active }); await load(); } catch (e) { setErr(errText(e, "Could not update it.")); }
  };
  const removeType = async (t: MeetingType) => {
    if (!window.confirm(`Remove "${t.name}"? Bookings already made are kept.`)) return;
    try { await api.delete(`/api/booking-settings/meeting-types/${t.id}`); await load(); } catch (e) { setErr(errText(e, "Could not remove it.")); }
  };
  const setHours = (d: number, v: Array<[string, string]>) => setSettings({ ...settings, hours: { ...settings.hours, [d]: v } });

  return (
    <div data-testid="booking-settings">
      <Section id="bk-links" title="Booking links" intro="Put these in email signatures, texts and ads. Clients pick a time, get a confirmation email, and can cancel or reschedule themselves. Each booking creates or matches a contact.">
        {settings.team_page && <LinkRow label="Team (round robin)" url={data.links.team} />}
        {data.links.staff.map((s) => <LinkRow key={s.user_id} label={s.name} url={s.url} />)}
      </Section>

      <Section id="bk-types" title="Meeting types" intro="With none, pages offer a 30-minute phone call.">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={cell}>Name</th><th style={cell}>Length</th><th style={cell}>How</th><th style={cell}>Buffer</th><th style={cell}>Notice</th><th style={cell}>Days ahead</th><th style={cell} /></tr></thead>
            <tbody>
              {data.meeting_types.length === 0 && <tr><td style={cell} colSpan={7}>No meeting types yet.</td></tr>}
              {data.meeting_types.map((t) => (
                <tr key={t.id} data-testid="bk-type">
                  <td style={cell}>{t.name}{t.active ? "" : " (hidden)"}</td><td style={cell}>{t.duration_min} min</td><td style={cell}>{t.kind === "video" ? "Video" : "Phone"}</td>
                  <td style={cell}>{t.buffer_min} min</td><td style={cell}>{Math.round(t.min_notice_min / 60)} h</td><td style={cell}>{t.max_days_ahead}</td>
                  <td style={cell}><button type="button" style={quiet} onClick={() => void toggleType(t)}>{t.active ? "Hide" : "Show"}</button> <button type="button" style={danger} onClick={() => void removeType(t)}>Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ ...muted, marginTop: 12 }}>Add a meeting type</p>
        <Field id="bk-name" label="Name"><input id="bk-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} style={input} placeholder="Intro call" /></Field>
        <Field id="bk-len" label="Length (minutes)"><input id="bk-len" type="number" min={10} max={240} value={draft.duration_min} onChange={(e) => setDraft({ ...draft, duration_min: Number(e.target.value) })} style={{ ...input, width: 100 }} /></Field>
        <Field id="bk-kind" label="Phone or video">
          <select id="bk-kind" value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as "phone" })} style={{ ...input, width: 160 }}><option value="phone">Phone call</option><option value="video">Video meeting</option></select>
        </Field>
        <Field id="bk-buffer" label="Buffer around it (minutes)"><input id="bk-buffer" type="number" min={0} max={120} value={draft.buffer_min} onChange={(e) => setDraft({ ...draft, buffer_min: Number(e.target.value) })} style={{ ...input, width: 100 }} /></Field>
        <Field id="bk-notice" label="Minimum notice (hours)"><input id="bk-notice" type="number" min={0} max={336} value={Math.round(draft.min_notice_min / 60)} onChange={(e) => setDraft({ ...draft, min_notice_min: Number(e.target.value) * 60 })} style={{ ...input, width: 100 }} /></Field>
        <Field id="bk-ahead" label="How far ahead (days)"><input id="bk-ahead" type="number" min={1} max={90} value={draft.max_days_ahead} onChange={(e) => setDraft({ ...draft, max_days_ahead: Number(e.target.value) })} style={{ ...input, width: 100 }} /></Field>
        <button type="button" style={button} disabled={!draft.name.trim()} onClick={() => void addType()}>Add meeting type</button>
      </Section>

      <Section id="bk-settings" title="Hours and reminders" intro={`Times clients can book, in ${data.time_zone} (${data.zone_label}). Each person's calendar is checked too.`}>
        {DAY_LABELS.map((label, d) => {
          const r = settings.hours[d]?.[0];
          return (
            <Field key={d} id={`bk-day-${d}`} label={label}>
              <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                <Toggle id={`bk-day-${d}`} label="Bookable" checked={Boolean(r)} onChange={(on) => setHours(d, on ? [["09:00", "17:00"]] : [])} />
                {r && <><input aria-label={`${label} from`} type="time" value={r[0]} onChange={(e) => setHours(d, [[e.target.value, r[1]]])} style={{ ...input, width: 120 }} /><span>to</span>
                  <input aria-label={`${label} until`} type="time" value={r[1]} onChange={(e) => setHours(d, [[r[0], e.target.value]])} style={{ ...input, width: 120 }} /></>}
              </div>
            </Field>
          );
        })}
        <Toggle id="bk-team" label="Offer the team page (round robin)" checked={settings.team_page} onChange={(team_page) => setSettings({ ...settings, team_page })} />
        <Toggle id="bk-e24" label="Email reminder 24 hours before" checked={settings.reminders.email_24h} onChange={(v) => setSettings({ ...settings, reminders: { ...settings.reminders, email_24h: v } })} />
        <Toggle id="bk-e1" label="Email reminder 1 hour before" checked={settings.reminders.email_1h} onChange={(v) => setSettings({ ...settings, reminders: { ...settings.reminders, email_1h: v } })} />
        <Toggle id="bk-s24" label="Text reminder 24 hours before (only clients who agree to texts)" checked={settings.reminders.sms_24h} onChange={(v) => setSettings({ ...settings, reminders: { ...settings.reminders, sms_24h: v } })} />
        <Toggle id="bk-s1" label="Text reminder 1 hour before (only clients who agree to texts)" checked={settings.reminders.sms_1h} onChange={(v) => setSettings({ ...settings, reminders: { ...settings.reminders, sms_1h: v } })} />
        <Field id="bk-note" label="Note in the confirmation email"><textarea id="bk-note" rows={2} maxLength={500} value={settings.confirmation_note} onChange={(e) => setSettings({ ...settings, confirmation_note: e.target.value })} style={input} /></Field>
        <button type="button" style={button} onClick={() => void saveSettings()}>Save booking settings</button>
      </Section>
      <Notice error={err} ok={ok} />
    </div>
  );
}
