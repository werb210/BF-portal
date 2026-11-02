// BF_PORTAL_v869_PHONE_MENU - Settings > Phone menu (Admins): what callers to the 866 main line hear and where each
// key goes (BF-Server /api/phone-menu, ported from KS-Portal #35). Boreal's menu has a second level (Boreal Financial:
// client engagement / credit) and spoken-only options, so the editor shows both. Until a menu is saved, the live menu
// is shown exactly as callers hear it today.
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "@/api";
import { DAY_LABELS, Field, Notice, Section, Toggle, button, cell, danger, errText, input, muted, quiet } from "./ui";

type Prompt = { mode: "tts" | "audio"; text: string; audioId: string | null };
type NoChoice = { retry: boolean; optionId: string | null };
type SubMenu = { prompt: Prompt; announceOptions: boolean; retryPrompt: string; options: Option[]; whenNoChoice: NoChoice };
type Target =
  | { type: "user"; userId: string; name: string }
  | { type: "group"; userIds: string[]; strategy: "simultaneous" | "sequential"; everyoneAvailable: boolean; exceptUserIds: string[] }
  | { type: "voicemail"; userId: string | null; message: string }
  | { type: "ai" }
  | { type: "meeting" }
  | { type: "queue"; queueId: string } // BF_PORTAL_v871_CALL_QUEUES
  | { type: "submenu"; menu: SubMenu };
type Option = { id: string; digit: string | null; label: string; keywords: string[]; target: Target };
const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
type Menu = {
  greeting: Prompt; announceOptions: boolean;
  hours: { enabled: boolean; weekly: Record<(typeof DAY_KEYS)[number], Array<[string, string]>> };
  afterHoursGreeting: Prompt; afterHours: Target; options: Option[]; whenNoChoice: NoChoice;
  noAnswer: { ringSeconds: number; target: Target }; holidays: Array<{ date: string; name: string }>;
};
type User = { id: string; name: string };
type Audio = { id: string; file_name: string | null };
type QueueRef = { id: string; name: string };
type Loaded = { menu: Menu; is_default: boolean; users: User[]; audio: Audio[]; queues?: QueueRef[]; stale_user_ids: string[]; time_zone: string; zone_label: string; open_now: boolean; spoken_greeting: string };

const TARGET_LABEL: Record<Target["type"], string> = {
  user: "Ring one person", group: "Ring a group", voicemail: "Voicemail", ai: "AI receptionist (caller says what they need)",
  meeting: "Meeting dial-in (access code)", submenu: "A second menu",
  queue: "Call queue (callers wait for the next free person)", // BF_PORTAL_v871_CALL_QUEUES
};
/** BF_PORTAL_v871_CALL_QUEUES - the active call queues (Settings > Call queues) an option can send callers to. */
const QueuesContext = createContext<QueueRef[]>([]);
const firstName = (u: User | undefined) => String(u?.name ?? "").split(" ")[0] ?? "";
const newId = (taken: string[]) => { let n = taken.length + 1; while (taken.includes(`opt${n}`)) n += 1; return `opt${n}`; };

function blankTarget(type: Target["type"], users: User[], queues: QueueRef[] = []): Target {
  if (type === "queue") return { type, queueId: queues[0]?.id ?? "" };
  if (type === "user") return { type, userId: users[0]?.id ?? "", name: firstName(users[0]) };
  if (type === "group") return { type, userIds: users.map((u) => u.id), strategy: "simultaneous", everyoneAvailable: false, exceptUserIds: [] };
  if (type === "voicemail") return { type, userId: null, message: "" };
  if (type === "submenu") return { type, menu: { prompt: { mode: "tts", text: "", audioId: null }, announceOptions: true, retryPrompt: "", options: [], whenNoChoice: { retry: true, optionId: null } } };
  return { type } as Target;
}

function PeopleToggles({ id, users, chosen, onChange }: { id: string; users: User[]; chosen: string[]; onChange: (ids: string[]) => void }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
      {users.map((u) => (
        <Toggle key={u.id} id={`${id}-${u.id}`} label={u.name} checked={chosen.includes(u.id)}
          onChange={(on) => onChange(on ? [...chosen, u.id] : chosen.filter((x) => x !== u.id))} />
      ))}
    </div>
  );
}

function TargetEditor({ id, value, users, audio, onChange, allow, allIds }: { id: string; value: Target; users: User[]; audio: Audio[]; onChange: (t: Target) => void; allow: Target["type"][]; allIds: string[] }) {
  const queues = useContext(QueuesContext);
  // "Call queue" is offered once a queue exists (or when this option already points at one).
  const types = allow.filter((t) => t !== "queue" || queues.length > 0 || value.type === "queue");
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <select id={id} aria-label="Where it goes" value={value.type} onChange={(e) => onChange(blankTarget(e.target.value as Target["type"], users, queues))} style={input}>
        {types.map((t) => <option key={t} value={t}>{TARGET_LABEL[t]}</option>)}
      </select>
      {value.type === "queue" && (
        <select aria-label="Queue" value={value.queueId} onChange={(e) => onChange({ type: "queue", queueId: e.target.value })} style={input}>
          {!queues.some((q) => q.id === value.queueId) && <option value={value.queueId}>Choose a queue</option>}
          {queues.map((q) => <option key={q.id} value={q.id}>{q.name}</option>)}
        </select>
      )}
      {value.type === "user" && (
        <>
          <select aria-label="Person" value={value.userId} onChange={(e) => onChange({ ...value, userId: e.target.value, name: firstName(users.find((u) => u.id === e.target.value)) })} style={input}>
            {!users.some((u) => u.id === value.userId) && <option value={value.userId}>Choose a person</option>}
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <input aria-label="Name callers hear" value={value.name} maxLength={60} onChange={(e) => onChange({ ...value, name: e.target.value })} style={input} placeholder="Name callers hear (for example: Todd)" />
        </>
      )}
      {value.type === "voicemail" && (
        <>
          <select aria-label="Voicemail box" value={value.userId ?? ""} onChange={(e) => onChange({ ...value, userId: e.target.value || null })} style={input}>
            <option value="">The person who was rung, else the shared voicemail</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}'s voicemail</option>)}
          </select>
          <input aria-label="Said before the voicemail prompt" value={value.message} maxLength={600} onChange={(e) => onChange({ ...value, message: e.target.value })} style={input} placeholder="Said first (optional), for example: Let me take a message for the team." />
        </>
      )}
      {value.type === "group" && (
        <div style={{ display: "grid", gap: 4 }}>
          <select aria-label="How the group rings" value={value.strategy} onChange={(e) => onChange({ ...value, strategy: e.target.value as "simultaneous" | "sequential", everyoneAvailable: e.target.value === "sequential" ? false : value.everyoneAvailable })} style={input}>
            <option value="simultaneous">Everyone at once</option>
            <option value="sequential">One at a time, in this order</option>
          </select>
          <PeopleToggles id={`${id}-people`} users={users} chosen={value.userIds} onChange={(userIds) => onChange({ ...value, userIds })} />
          {value.strategy === "simultaneous" && (
            <Toggle id={`${id}-everyone`} label="Also ring everyone else who is available" checked={value.everyoneAvailable} onChange={(everyoneAvailable) => onChange({ ...value, everyoneAvailable, exceptUserIds: everyoneAvailable ? value.exceptUserIds : [] })} />
          )}
          {value.everyoneAvailable && (
            <>
              <span style={{ fontSize: 13 }}>Never ring:</span>
              <PeopleToggles id={`${id}-except`} users={users} chosen={value.exceptUserIds} onChange={(exceptUserIds) => onChange({ ...value, exceptUserIds })} />
            </>
          )}
          <p style={muted}>The first person chosen also gets their Watch cell after 15 seconds, when they have turned that on.</p>
        </div>
      )}
      {value.type === "submenu" && (
        <div style={{ border: "1px solid var(--ui-border)", borderRadius: 8, padding: 8 }}>
          <PromptEditor id={`${id}-prompt`} label="Second menu prompt" value={value.menu.prompt} audio={audio} onChange={(prompt) => onChange({ ...value, menu: { ...value.menu, prompt } })} />
          <Toggle id={`${id}-announce`} label="After the prompt, read the options" checked={value.menu.announceOptions} onChange={(announceOptions) => onChange({ ...value, menu: { ...value.menu, announceOptions } })} />
          <Field id={`${id}-retry`} label="Asked again when unclear">
            <input id={`${id}-retry`} value={value.menu.retryPrompt} maxLength={600} onChange={(e) => onChange({ ...value, menu: { ...value.menu, retryPrompt: e.target.value } })} style={input} placeholder="Sorry, I didn't catch that. For ..., press 1." />
          </Field>
          <OptionsTable id={`${id}-opts`} options={value.menu.options} users={users} audio={audio} nested allIds={allIds} onChange={(options) => onChange({ ...value, menu: { ...value.menu, options } })} />
          <NoChoiceEditor id={`${id}-nochoice`} value={value.menu.whenNoChoice} options={value.menu.options} onChange={(whenNoChoice) => onChange({ ...value, menu: { ...value.menu, whenNoChoice } })} />
        </div>
      )}
    </div>
  );
}

function NoChoiceEditor({ id, value, options, onChange }: { id: string; value: NoChoice; options: Option[]; onChange: (v: NoChoice) => void }) {
  return (
    <div style={{ display: "grid", gap: 4, marginTop: 8 }}>
      <Toggle id={`${id}-retry`} label="When a caller says nothing or something unclear, ask once more" checked={value.retry} onChange={(retry) => onChange({ ...value, retry })} />
      <Field id={`${id}-option`} label="Then send them to">
        <select id={`${id}-option`} value={value.optionId ?? ""} onChange={(e) => onChange({ ...value, optionId: e.target.value || null })} style={input}>
          <option value="">Voicemail</option>
          {options.map((o) => <option key={o.id} value={o.id}>{o.label || o.id}</option>)}
        </select>
      </Field>
    </div>
  );
}

function OptionsTable({ id, options, users, audio, nested, allIds, onChange }: { id: string; options: Option[]; users: User[]; audio: Audio[]; nested?: boolean; allIds: string[]; onChange: (o: Option[]) => void }) {
  const setOption = (i: number, patch: Partial<Option>) => onChange(options.map((o, j) => (j === i ? { ...o, ...patch } : o)));
  const nextDigit = DIGITS.find((d) => !options.some((o) => o.digit === d));
  const allow: Target["type"][] = nested ? ["user", "group", "voicemail", "ai", "meeting", "queue"] : ["user", "group", "voicemail", "ai", "meeting", "queue", "submenu"];
  return (
    <>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th style={cell}>Key</th><th style={cell}>Label (read to callers)</th><th style={cell}>Goes to</th><th style={cell}>Words callers can say</th><th style={cell} /></tr></thead>
          <tbody>
            {options.map((o, i) => (
              <tr key={o.id || i} data-testid={nested ? "pm-sub-option" : "pm-option"}>
                <td style={cell}>
                  <select aria-label="Key" value={o.digit ?? ""} onChange={(e) => setOption(i, { digit: e.target.value || null })} style={{ ...input, width: 110 }}>
                    <option value="">Spoken only</option>
                    {DIGITS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </td>
                <td style={cell}><input aria-label="Label" value={o.label} maxLength={80} onChange={(e) => setOption(i, { label: e.target.value })} style={input} /></td>
                <td style={cell}><TargetEditor id={`${id}-${i}`} value={o.target} users={users} audio={audio} allow={allow} allIds={allIds} onChange={(target) => setOption(i, { target })} /></td>
                <td style={cell}><input aria-label="Words callers can say" value={o.keywords.join(", ")} onChange={(e) => setOption(i, { keywords: e.target.value.split(",").map((k) => k.trim()).filter(Boolean) })} style={input} placeholder="credit, approval" /></td>
                <td style={cell}><button type="button" style={danger} onClick={() => onChange(options.filter((_, j) => j !== i))}>Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {options.length < 12 && <button type="button" style={{ ...quiet, marginTop: 8 }} onClick={() => onChange([...options, { id: newId(allIds), digit: nextDigit ?? null, label: "", keywords: [], target: blankTarget("user", users) }])}>Add an option</button>}
    </>
  );
}

/** Every option id in the menu (ids must be unique across both levels). */
function menuIds(m: Menu): string[] {
  return m.options.flatMap((o) => [o.id, ...(o.target.type === "submenu" ? o.target.menu.options.map((x) => x.id) : [])]);
}

function PromptEditor({ id, label, value, audio, onChange }: { id: string; label: string; value: Prompt; audio: Audio[]; onChange: (p: Prompt) => void }) {
  return (
    <Field id={id} label={label}>
      <div style={{ display: "grid", gap: 6 }}>
        <select aria-label={`${label}: read aloud or recording`} value={value.mode} onChange={(e) => onChange({ ...value, mode: e.target.value as "tts" | "audio", audioId: e.target.value === "audio" ? (value.audioId ?? audio[0]?.id ?? null) : null })} style={input}>
          <option value="tts">Read this text aloud</option>
          <option value="audio" disabled={!audio.length}>Play an uploaded recording{audio.length ? "" : " (upload one below)"}</option>
        </select>
        {value.mode === "tts"
          ? <textarea id={id} value={value.text} maxLength={600} rows={2} onChange={(e) => onChange({ ...value, text: e.target.value })} style={input} />
          : <select id={id} value={value.audioId ?? ""} onChange={(e) => onChange({ ...value, audioId: e.target.value })} style={input}>
              {audio.map((a) => <option key={a.id} value={a.id}>{a.file_name || a.id}</option>)}
            </select>}
      </div>
    </Field>
  );
}

export default function PhoneMenuSettings() {
  const [data, setData] = useState<Loaded | null>(null);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [holiday, setHoliday] = useState({ date: "", name: "" });

  const load = useCallback(async () => {
    try {
      const r = await api.get<Loaded>("/api/phone-menu");
      setData(r); setMenu(r.menu);
    } catch (e) { setErr(errText(e, "Could not load the phone menu.")); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  if (!menu || !data) return <div data-testid="phone-menu-settings"><Notice error={err} />{!err && <p style={muted}>Loading...</p>}</div>;
  const users = data.users;
  const set = (patch: Partial<Menu>) => setMenu({ ...menu, ...patch });
  const allIds = menuIds(menu);

  const save = async () => {
    setBusy(true); setErr(null); setOk(null);
    try {
      const r = await api.put<{ spoken_greeting: string }>("/api/phone-menu", { menu });
      setOk(`Saved. Callers now hear: "${r.spoken_greeting}"`);
      await load();
    } catch (e) { setErr(errText(e, "Could not save the phone menu.")); } finally { setBusy(false); }
  };
  const reset = async () => {
    if (!window.confirm("Go back to Boreal's default menu (the one callers heard before any change)?")) return;
    try { await api.post("/api/phone-menu/reset", {}); setOk("Back to the default menu."); await load(); } catch (e) { setErr(errText(e, "Could not reset.")); }
  };
  const upload = async (file: File | null) => {
    if (!file) return;
    setErr(null);
    const form = new FormData();
    form.append("file", file);
    try { await api.post("/api/phone-menu/audio", form); setOk("Recording uploaded. Choose it as a greeting, then save."); await load(); }
    catch (e) { setErr(errText(e, "Could not upload the recording. Use an MP3 or WAV up to 5 MB.")); }
  };
  const removeAudio = async (id: string) => {
    try { await api.delete(`/api/phone-menu/audio/${id}`); await load(); } catch (e) { setErr(errText(e, "Could not remove the recording.")); }
  };

  return (
    <QueuesContext.Provider value={data.queues ?? []}>
    <div data-testid="phone-menu-settings">
      <Section id="pm-greeting" title="Greeting" intro={<>What callers to the 866 main line hear first. {data.is_default ? "This is the menu callers hear today. Change it and save to use your version." : ""} Office status now: <strong>{data.open_now ? "open" : "closed"}</strong> ({data.zone_label}).</>}>
        <PromptEditor id="pm-greeting-text" label="Greeting" value={menu.greeting} audio={data.audio} onChange={(greeting) => set({ greeting })} />
        <Toggle id="pm-announce" label="After the greeting, read the options (For sales, press 1...)" checked={menu.announceOptions} onChange={(announceOptions) => set({ announceOptions })} />
        <p style={muted}>Callers can also say what they want. A caller can key the meeting option followed by a meeting access code and # to join a meeting in one step.</p>
      </Section>

      <Section id="pm-options" title="Menu options" intro="Up to nine keys, plus options callers can only say (for example a name). Words help when a caller speaks instead of pressing a key; words of three letters or fewer must be said on their own. When words fit more than one option, the higher key wins.">
        {data.stale_user_ids.length > 0 && <Notice error="This menu still sends calls to someone who is no longer an active user. Change those options and save." />}
        <OptionsTable id="pm-opt" options={menu.options} users={users} audio={data.audio} allIds={allIds} onChange={(options) => set({ options })} />
        <NoChoiceEditor id="pm-nochoice" value={menu.whenNoChoice} options={menu.options} onChange={(whenNoChoice) => set({ whenNoChoice })} />
      </Section>

      <Section id="pm-noanswer" title="When nobody answers" intro="Used when nobody picks up or nobody can be rung. Voicemail with no person chosen is the voicemail of whoever was rung (the shared voicemail for a group).">
        <Field id="pm-ring" label="Ring for (seconds)">
          <input id="pm-ring" type="number" min={10} max={60} value={menu.noAnswer.ringSeconds} onChange={(e) => set({ noAnswer: { ...menu.noAnswer, ringSeconds: Number(e.target.value) } })} style={{ ...input, width: 100 }} />
        </Field>
        <Field id="pm-noanswer-target" label="Then">
          <TargetEditor id="pm-noanswer-target" value={menu.noAnswer.target} users={users} audio={data.audio} allIds={allIds} allow={["voicemail", "user", "group", "queue"]} onChange={(target) => set({ noAnswer: { ...menu.noAnswer, target } })} />
        </Field>
      </Section>

      <Section id="pm-hours" title="Business hours and holidays" intro={`In ${data.zone_label} (UTC-6 all year). Outside these hours, and on holidays, callers hear the after-hours greeting.`}>
        <Toggle id="pm-hours-on" label="Use business hours (off: always open, except holidays)" checked={menu.hours.enabled} onChange={(enabled) => set({ hours: { ...menu.hours, enabled } })} />
        {menu.hours.enabled && DAY_KEYS.map((d, i) => {
          const range = menu.hours.weekly[d][0];
          return (
            <Field key={d} id={`pm-day-${d}`} label={DAY_LABELS[i]!}>
              <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                <Toggle id={`pm-day-${d}`} label="Open" checked={Boolean(range)} onChange={(on) => set({ hours: { ...menu.hours, weekly: { ...menu.hours.weekly, [d]: on ? [["09:00", "17:00"]] : [] } } })} />
                {range && <>
                  <input aria-label={`${DAY_LABELS[i]} opens`} type="time" value={range[0]} onChange={(e) => set({ hours: { ...menu.hours, weekly: { ...menu.hours.weekly, [d]: [[e.target.value, range[1]]] } } })} style={{ ...input, width: 120 }} />
                  <span>to</span>
                  <input aria-label={`${DAY_LABELS[i]} closes`} type="time" value={range[1]} onChange={(e) => set({ hours: { ...menu.hours, weekly: { ...menu.hours.weekly, [d]: [[range[0], e.target.value]] } } })} style={{ ...input, width: 120 }} />
                </>}
              </div>
            </Field>
          );
        })}
        <PromptEditor id="pm-after-text" label="After-hours greeting" value={menu.afterHoursGreeting} audio={data.audio} onChange={(afterHoursGreeting) => set({ afterHoursGreeting })} />
        <Field id="pm-after-target" label="After hours, callers go to">
          <TargetEditor id="pm-after-target" value={menu.afterHours} users={users} audio={data.audio} allIds={allIds} allow={["voicemail", "user", "group", "ai"]} onChange={(afterHours) => set({ afterHours })} />
        </Field>
        <p style={{ ...muted, marginTop: 12 }}>Holidays (closed all day)</p>
        <ul style={{ margin: "0 0 8px", paddingLeft: 18 }}>
          {menu.holidays.map((h, i) => (
            <li key={`${h.date}-${i}`} style={{ fontSize: 13 }}>{h.date} {h.name} <button type="button" style={quiet} onClick={() => set({ holidays: menu.holidays.filter((_, j) => j !== i) })}>Remove</button></li>
          ))}
        </ul>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <input aria-label="Holiday date" type="date" value={holiday.date} onChange={(e) => setHoliday({ ...holiday, date: e.target.value })} style={{ ...input, width: 170 }} />
          <input aria-label="Holiday name" placeholder="Christmas Day" value={holiday.name} onChange={(e) => setHoliday({ ...holiday, name: e.target.value })} style={{ ...input, width: 200 }} />
          <button type="button" style={quiet} disabled={!holiday.date} onClick={() => { set({ holidays: [...menu.holidays, { date: holiday.date, name: holiday.name || "Holiday" }] }); setHoliday({ date: "", name: "" }); }}>Add holiday</button>
        </div>
      </Section>

      <Section id="pm-audio" title="Recordings" intro="Upload an MP3 or WAV (up to 5 MB) to play instead of reading a greeting aloud.">
        <input aria-label="Upload a recording" type="file" accept="audio/mpeg,audio/wav,.mp3,.wav" onChange={(e) => void upload(e.target.files?.[0] ?? null)} />
        <ul style={{ paddingLeft: 18 }}>
          {data.audio.map((a) => <li key={a.id} style={{ fontSize: 13 }}>{a.file_name || a.id} <button type="button" style={quiet} onClick={() => void removeAudio(a.id)}>Remove</button></li>)}
        </ul>
      </Section>

      <Notice error={err} ok={ok} />
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button type="button" style={button} disabled={busy} onClick={() => void save()}>{busy ? "Saving..." : "Save phone menu"}</button>
        {!data.is_default && <button type="button" style={quiet} onClick={() => void reset()}>Back to Boreal's default menu</button>}
      </div>
    </div>
    </QueuesContext.Provider>
  );
}
