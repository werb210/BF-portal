// BF_PORTAL_v871_CALL_QUEUES - Settings > Call queues, ported from KS-Portal #41. Everyone who answers queues: their
// "available for queue calls" switch. Admins: the live queue panel (waiting and connected callers, who is free, today's
// numbers, callback requests), queue set-up (members, greeting, hold music and messages, place-in-line announcements,
// longest wait, overflow) and whether the 866 main line goes straight into a queue. Phone-menu options pick a queue in
// Settings > Phone menu. With no queue set up, callers hear the phone menu exactly as before.
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { startOutboundPstn } from "@/dialer/actions";
import { Field, Notice, Section, Toggle, button, cell, danger, errText, input, muted, quiet } from "@/settingsPack/ui";
import { callQueuesApi, duration, type Live, type Queue, type QueueSetup } from "./callQueuesApi";

const LIVE_POLL_MS = 5000;
type Draft = Omit<Queue, "id" | "archived_at"> & { id: string | null };
const blank = (): Draft => ({ id: null, silo: "BF", name: "", greeting: "Thanks for calling. The next available person will be with you shortly.", hold_message: "Thanks for waiting. Someone will be with you soon.", hold_audio_id: null, announce_position: true, max_wait_seconds: 300, ring_seconds: 20, overflow: "ask", overflow_user_id: null, member_ids: [] });

// BF_PORTAL_v887_MY_QUEUE_SWITCH - also on Settings > My Profile (Admin, Staff, Marketing) since v885 hid Call queues
// from Staff and Marketing. On My Profile ("compact") someone in no queue sees one line instead of the whole section.
export function MyQueueAvailability({ compact = false }: { compact?: boolean } = {}) {
  const [me, setMe] = useState<{ available: boolean; queues: string[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { void callQueuesApi.me().then((r) => setMe({ available: !!r?.available, queues: Array.isArray(r?.queues) ? r.queues : [] })).catch((e) => setErr(errText(e, "Could not load your queue status."))); }, []);
  const set = async (available: boolean) => {
    setErr(null);
    try { await callQueuesApi.setMe(available); setMe((m) => (m ? { ...m, available } : m)); } catch (e) { setErr(errText(e, "Could not change your status.")); }
  };
  if (compact && me && me.queues.length === 0) {
    return <p data-testid="my-queue-none" style={muted}>You&apos;re not in any call queue.</p>;
  }
  if (compact && !me && !err) return null;
  return (
    <Section id="my-queue" title="My queue calls" intro="While you are available, callers waiting in your queues ring your app in turn, longest free first.">
      <Notice error={err} />
      {me && (me.queues.length ? <>
        <Toggle id="queue-available" label={me.available ? "Available for queue calls" : "Not taking queue calls"} checked={me.available} onChange={(v) => void set(v)} />
        <p style={muted}>Your queues: {me.queues.join(", ")}.</p>
      </> : <p style={muted}>You are not in any call queue.</p>)}
    </Section>
  );
}

export function LiveQueuePanel({ setup }: { setup: QueueSetup | null }) {
  const [live, setLive] = useState<Live | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(async () => {
    try { setLive(await callQueuesApi.live()); setErr(null); } catch (e) { setErr(errText(e, "Could not load the live queues.")); }
  }, []);
  useEffect(() => {
    void load();
    const t = setInterval(() => { void load(); }, LIVE_POLL_MS);
    return () => clearInterval(t);
  }, [load]);
  const queueName = (id: string) => setup?.queues.find((q) => q.id === id)?.name ?? "Queue";
  return (
    <Section id="live-queues" title="Live queues" intro="Updates every few seconds.">
      <Notice error={err} />
      {live?.queues.length === 0 && <p style={muted}>No queues yet.</p>}
      {live?.queues.map((q) => (
        <div key={q.id} data-testid={`live-${q.id}`} style={{ borderTop: "1px solid var(--ui-border)", padding: "8px 0" }}>
          <strong>{q.name}</strong>
          <span style={{ marginLeft: 8, fontSize: 13, color: "var(--ui-text-muted)" }}>
            {q.waiting.length} waiting, {q.connected.length} talking. Today: {q.today.answered} answered, {q.today.abandoned} hung up, {q.today.voicemail} voicemails, {q.today.callbacks} callbacks; average wait {duration(q.today.avg_wait_seconds)}, longest {duration(q.today.longest_wait_seconds)}.
          </span>
          {q.waiting.length > 0 && (
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 6 }}>
              <tbody>{q.waiting.map((w) => (
                <tr key={w.id}>
                  <td style={cell}>{w.position}.</td>
                  <td style={cell}>{w.caller_name ?? w.from ?? "Unknown caller"}</td>
                  <td style={{ ...cell, color: w.wait_seconds > q.max_wait_seconds * 0.75 ? "#991b1b" : "var(--ui-text)", fontWeight: w.wait_seconds > q.max_wait_seconds * 0.75 ? 700 : 400 }}>waiting {duration(w.wait_seconds)}</td>
                  <td style={cell}>{w.ringing ? `Ringing ${w.ringing}` : "Nobody free yet"}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
          {q.connected.map((c) => <div key={c.id} style={{ fontSize: 13 }}>{c.agent ?? "Someone"} is talking with {c.caller_name ?? c.from ?? "a caller"} ({duration(c.talk_seconds)})</div>)}
        </div>
      ))}
      {live && live.agents.length > 0 && <>
        <h4 style={{ margin: "12px 0 4px", fontSize: 14, color: "var(--ui-text)" }}>People</h4>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>{live.agents.map((a) => (
            <tr key={a.user_id} data-testid={`agent-${a.user_id}`}>
              <td style={cell}>{a.name}</td>
              <td style={cell}>{a.on_call ? "On a call" : !a.available ? "Not taking queue calls" : !a.signed_in ? "Available, but not signed in to the app" : a.busy ? "Busy" : `Free${a.idle_seconds !== null ? ` for ${duration(a.idle_seconds)}` : ""}`}</td>
              <td style={cell}><Toggle id={`agent-av-${a.user_id}`} label="Available" checked={a.available} onChange={(v) => void callQueuesApi.setAgent(a.user_id, v).then(load).catch((e) => setErr(errText(e, "Could not change their status.")))} /></td>
            </tr>
          ))}</tbody>
        </table>
      </>}
      {live && live.callbacks.length > 0 && <>
        <h4 style={{ margin: "12px 0 4px", fontSize: 14, color: "var(--ui-text)" }}>Callback requests</h4>
        {live.callbacks.map((c) => (
          <div key={c.id} data-testid={`callback-${c.id}`} style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 0" }}>
            <span style={{ fontSize: 13 }}>{c.caller_name ?? c.from_number ?? "Unknown"} ({queueName(c.queue_id)})</span>
            {c.from_number && <button type="button" style={quiet} onClick={() => void startOutboundPstn(c.from_number!, { contactId: c.contact_id, contactName: c.caller_name, source: "call_queue_callback" })}>Call back</button>}
            <button type="button" style={quiet} onClick={() => void callQueuesApi.callbackDone(c.id).then(load).catch((e) => setErr(errText(e, "Could not update the callback.")))}>Done</button>
          </div>
        ))}
      </>}
    </Section>
  );
}

function QueueEditor({ draft, setDraft, setup, onSave, onCancel }: { draft: Draft; setDraft: (d: Draft) => void; setup: QueueSetup; onSave: () => void; onCancel: () => void }) {
  const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });
  return (
    <div data-testid="queue-editor">
      <Field id="cq-name" label="Queue name"><input id="cq-name" value={draft.name} onChange={(e) => set({ name: e.target.value })} style={input} /></Field>
      <Field id="cq-silo" label="Callers are for">
        <select id="cq-silo" value={draft.silo} onChange={(e) => set({ silo: e.target.value as Draft["silo"] })} style={input}>
          <option value="BF">Boreal Financial</option>
          <option value="BI">Boreal Insurance</option>
        </select>
      </Field>
      <Field id="cq-greeting" label="Greeting (said once)"><textarea id="cq-greeting" rows={2} value={draft.greeting} onChange={(e) => set({ greeting: e.target.value })} style={input} /></Field>
      <Field id="cq-hold-msg" label="Message while holding"><textarea id="cq-hold-msg" rows={2} value={draft.hold_message} onChange={(e) => set({ hold_message: e.target.value })} style={input} /></Field>
      <Field id="cq-music" label="Hold music">
        <select id="cq-music" value={draft.hold_audio_id ?? ""} onChange={(e) => set({ hold_audio_id: e.target.value || null })} style={input}>
          <option value="">Standard hold music (Twilio's classical music)</option>
          {setup.audio.map((a) => <option key={a.id} value={a.id}>{a.file_name ?? "Uploaded recording"}</option>)}
        </select>
      </Field>
      <Toggle id="cq-pos" label="Tell callers their place in line" checked={draft.announce_position} onChange={(announce_position) => set({ announce_position })} />
      <Field id="cq-wait" label="Longest wait (minutes)"><input id="cq-wait" type="number" min={1} max={60} value={Math.round(draft.max_wait_seconds / 60)} onChange={(e) => set({ max_wait_seconds: Math.round(Number(e.target.value) * 60) })} style={{ ...input, width: 100 }} /></Field>
      <Field id="cq-ring" label="Ring each person (seconds)"><input id="cq-ring" type="number" min={10} max={60} value={draft.ring_seconds} onChange={(e) => set({ ring_seconds: Number(e.target.value) })} style={{ ...input, width: 100 }} /></Field>
      <Field id="cq-overflow" label="After the longest wait">
        <select id="cq-overflow" value={draft.overflow} onChange={(e) => set({ overflow: e.target.value as Draft["overflow"] })} style={input}>
          <option value="ask">Let the caller choose: callback or voicemail</option>
          <option value="voicemail">Voicemail</option>
          <option value="callback">Take a callback request</option>
        </select>
      </Field>
      {draft.overflow !== "callback" && (
        <Field id="cq-vm" label="Voicemail box">
          <select id="cq-vm" value={draft.overflow_user_id ?? ""} onChange={(e) => set({ overflow_user_id: e.target.value || null })} style={input}>
            <option value="">Shared voicemail</option>
            {setup.users.map((u) => <option key={u.id} value={u.id}>{u.name}&apos;s voicemail</option>)}
          </select>
        </Field>
      )}
      <fieldset style={{ border: "1px solid var(--ui-border)", borderRadius: 8, padding: 10, margin: "8px 0" }}>
        <legend style={{ fontSize: 13, color: "var(--ui-text)" }}>Who answers this queue</legend>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {setup.users.map((u) => <Toggle key={u.id} id={`cq-m-${u.id}`} label={u.name} checked={draft.member_ids.includes(u.id)} onChange={(on) => set({ member_ids: on ? [...draft.member_ids, u.id] : draft.member_ids.filter((x) => x !== u.id) })} />)}
        </div>
      </fieldset>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" style={button} onClick={onSave}>Save queue</button>
        <button type="button" style={quiet} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

export default function CallQueuesSettings() {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";
  const [setup, setSetup] = useState<QueueSetup | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!isAdmin) return;
    try { setSetup(await callQueuesApi.setup()); } catch (e) { setErr(errText(e, "Could not load call queues.")); }
  }, [isAdmin]);
  useEffect(() => { void load(); }, [load]);

  const save = async () => {
    if (!draft) return;
    setErr(null); setOk(null);
    const { id, ...body } = draft;
    try { if (id) await callQueuesApi.update(id, body); else await callQueuesApi.create(body); setOk("Queue saved."); setDraft(null); await load(); }
    catch (e) { setErr(errText(e, "Could not save the queue.")); }
  };
  const archive = async (q: Queue) => {
    if (!window.confirm(`Archive the ${q.name} queue? Phone-menu options pointing at it will use the no-answer route.`)) return;
    try { await callQueuesApi.archive(q.id); setOk(`${q.name} archived.`); await load(); } catch (e) { setErr(errText(e, "Could not archive the queue.")); }
  };
  const setMain = async (id: string) => {
    try { await callQueuesApi.mainLine(id || null); setOk(id ? "Callers to the 866 number now wait in that queue after the greeting." : "Callers to the 866 number hear the phone menu."); await load(); }
    catch (e) { setErr(errText(e, "Could not change the main line.")); }
  };

  const active = (setup?.queues ?? []).filter((q) => !q.archived_at);
  return (
    <div data-testid="call-queues-settings">
      <MyQueueAvailability />
      {isAdmin && <>
        <LiveQueuePanel setup={setup} />
        <Section id="queue-setup" title="Queues" intro="Send a phone-menu option to a queue in Settings > Phone menu, or put every caller to the main number in one queue here.">
          <Notice error={err} ok={ok} />
          {draft && setup ? <QueueEditor draft={draft} setDraft={setDraft} setup={setup} onSave={() => void save()} onCancel={() => setDraft(null)} /> : <>
            {active.map((q) => (
              <div key={q.id} data-testid={`queue-${q.id}`} style={{ borderTop: "1px solid var(--ui-border)", padding: "8px 0" }}>
                <strong>{q.name}</strong> <span style={{ fontSize: 13, color: "var(--ui-text-muted)" }}>{q.silo === "BI" ? "Boreal Insurance" : "Boreal Financial"}, {q.member_ids.length} {q.member_ids.length === 1 ? "person" : "people"}, up to {duration(q.max_wait_seconds)} wait</span>
                <div style={{ marginTop: 4 }}>
                  <button type="button" style={quiet} onClick={() => setDraft({ ...q })}>Edit</button>{" "}
                  <button type="button" style={danger} onClick={() => void archive(q)}>Archive</button>
                </div>
              </div>
            ))}
            <button type="button" style={{ ...button, marginTop: 8 }} onClick={() => setDraft(blank())}>New queue</button>
            {setup && (<>
              <Field id="cq-main" label="866 main line">
                <select id="cq-main" value={setup.main_line_queue_id ?? ""} onChange={(e) => void setMain(e.target.value)} style={input}>
                  <option value="">Phone menu (no queue)</option>
                  {active.map((q) => <option key={q.id} value={q.id}>Straight into {q.name}</option>)}
                </select>
              </Field>
              {setup.main_line_queue_id && <p style={muted}>Callers hear your phone-menu greeting first, then wait in the queue. Change the greeting in Settings &gt; Phone menu so it does not ask them to press a key.</p>}
            </>)}
          </>}
        </Section>
      </>}
    </div>
  );
}
