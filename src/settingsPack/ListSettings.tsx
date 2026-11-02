// BF_PORTAL_v869_SETTINGS_PACK - three small Admin lists: Never log (BF-Server /api/never-log), Blocked numbers
// (/api/blocked-numbers) and Lead rotation (/api/lead-rotation).
import { useCallback, useEffect, useState } from "react";
import { api } from "@/api";
import { Field, Notice, Section, Toggle, button, cell, danger, errText, input, muted, when } from "./ui";

type Entry = { id: string; value: string; kind: "email" | "domain"; note: string | null };

export function NeverLogSettings() {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(async () => {
    try { setEntries((await api.get<{ entries: Entry[] }>("/api/never-log")).entries); } catch (e) { setErr(errText(e, "Could not load the list.")); setEntries([]); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const add = async () => {
    setErr(null);
    try { await api.post("/api/never-log", { value, note }); setValue(""); setNote(""); await load(); } catch (e) { setErr(errText(e, "Could not add it.")); }
  };
  return (
    <div data-testid="never-log-settings">
      <Section id="nl" title="Never log" intro="Mail to or from these addresses and domains is never logged to the CRM or filed automatically (for example personal, legal or HR mail). A domain covers its subdomains. Mail someone sends or files by hand from a contact is still logged.">
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <input aria-label="Email or domain" value={value} onChange={(e) => setValue(e.target.value)} placeholder="lawyer@firm.com or family.com" style={{ ...input, maxWidth: 300 }} />
          <input aria-label="Note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why (optional)" style={{ ...input, maxWidth: 240 }} />
          <button type="button" style={button} disabled={!value.trim()} onClick={() => void add()}>Add</button>
        </div>
        <Notice error={err} />
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 10 }}>
          <tbody>
            {entries?.length === 0 && <tr><td style={cell}>Nothing on the list.</td></tr>}
            {entries?.map((e) => (
              <tr key={e.id} data-testid="never-log-row">
                <td style={cell}>{e.kind === "domain" ? `Anyone at ${e.value}` : e.value}</td><td style={cell}>{e.note ?? ""}</td>
                <td style={cell}><button type="button" style={danger} onClick={async () => { try { await api.delete(`/api/never-log/${e.id}`); await load(); } catch (x) { setErr(errText(x, "Could not remove it.")); } }}>Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </div>
  );
}

type Blocked = { id: string; number: string; reason: string | null; created_at: string };
type BlockedEvent = { number: string; kind: string; action: string; body: string | null; created_at: string };

export function BlockedNumbersSettings() {
  const [data, setData] = useState<{ numbers: Blocked[]; settings: { call_action: "reject" | "voicemail" }; events: BlockedEvent[] } | null>(null);
  const [number, setNumber] = useState("");
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const load = useCallback(async () => {
    try { setData(await api.get("/api/blocked-numbers")); } catch (e) { setErr(errText(e, "Could not load blocked numbers.")); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const add = async () => {
    setErr(null); setOk(null);
    try { await api.post("/api/blocked-numbers", { number, reason }); setNumber(""); setReason(""); setOk("Number blocked."); await load(); } catch (e) { setErr(errText(e, "Could not block it.")); }
  };
  const setAction = async (call_action: string) => {
    try { await api.put("/api/blocked-numbers/settings", { call_action }); await load(); } catch (e) { setErr(errText(e, "Could not save.")); }
  };
  return (
    <div data-testid="blocked-numbers-settings">
      <Section id="bn" title="Blocked numbers" intro="Calls from these numbers never ring anyone. Their texts are ignored. Both are logged below.">
        <Field id="bn-action" label="Blocked callers">
          <select id="bn-action" value={data?.settings.call_action ?? "reject"} onChange={(e) => void setAction(e.target.value)} style={{ ...input, maxWidth: 380 }}>
            <option value="reject">Hear a polite message, then the call ends</option>
            <option value="voicemail">Go straight to voicemail</option>
          </select>
        </Field>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <input aria-label="Phone number" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="403-555-0100" style={{ ...input, maxWidth: 220 }} />
          <input aria-label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional)" style={{ ...input, maxWidth: 240 }} />
          <button type="button" style={button} disabled={!number.trim()} onClick={() => void add()}>Block</button>
        </div>
        <Notice error={err} ok={ok} />
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 10 }}>
          <tbody>
            {data?.numbers.length === 0 && <tr><td style={cell}>No blocked numbers.</td></tr>}
            {data?.numbers.map((b) => (
              <tr key={b.id} data-testid="blocked-row">
                <td style={cell}>{b.number}</td><td style={cell}>{b.reason ?? ""}</td><td style={cell}>{when(b.created_at)}</td>
                <td style={cell}><button type="button" style={danger} onClick={async () => { try { await api.delete(`/api/blocked-numbers/${b.id}`); await load(); } catch (x) { setErr(errText(x, "Could not unblock.")); } }}>Unblock</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
      <Section id="bn-log" title="Recently blocked" intro="The latest calls and texts stopped.">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {data?.events.length === 0 && <tr><td style={cell}>Nothing blocked yet.</td></tr>}
            {data?.events.map((e, i) => <tr key={i}><td style={cell}>{when(e.created_at)}</td><td style={cell}>{e.number}</td><td style={cell}>{e.kind === "call" ? `Call (${e.action === "voicemail" ? "to voicemail" : "message, ended"})` : "Text (ignored)"}</td><td style={cell}>{e.body ?? ""}</td></tr>)}
          </tbody>
        </table>
      </Section>
    </div>
  );
}

type Rotation = { enabled: boolean; user_ids: string[]; sources: { website: boolean; booking: boolean; form: boolean }; away_user_ids: string[] };

export function LeadRotationSettings() {
  const [s, setS] = useState<Rotation | null>(null);
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([]);
  const [recent, setRecent] = useState<Array<{ contact_name: string | null; user_id: string; source: string; assigned_at: string }>>([]);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const load = useCallback(async () => {
    try { const r = await api.get<any>("/api/lead-rotation"); setS(r.settings); setUsers(r.users); setRecent(r.recent ?? []); } catch (e) { setErr(errText(e, "Could not load lead rotation.")); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  if (!s) return <div data-testid="lead-rotation-settings"><Notice error={err} />{!err && <p style={muted}>Loading...</p>}</div>;
  const name = (id: string) => users.find((u) => u.id === id)?.name ?? "Someone";
  const save = async () => {
    setErr(null); setOk(null);
    try { await api.put("/api/lead-rotation", { settings: s }); setOk("Lead rotation saved."); } catch (e) { setErr(errText(e, "Could not save.")); }
  };
  return (
    <div data-testid="lead-rotation-settings">
      <Section id="lr" title="Lead rotation" intro="Share new leads fairly: each new lead goes to whoever was given one least recently. People marked away are skipped (they can mark themselves away in My Profile).">
        <Toggle id="lr-on" label="Give new leads an owner in turn" checked={s.enabled} onChange={(enabled) => setS({ ...s, enabled })} />
        <p style={muted}>Which leads</p>
        <Toggle id="lr-web" label="Website contact form and readiness check" checked={s.sources.website} onChange={(website) => setS({ ...s, sources: { ...s.sources, website } })} />
        <Toggle id="lr-book" label="Team booking page" checked={s.sources.booking} onChange={(booking) => setS({ ...s, sources: { ...s.sources, booking } })} />
        <Toggle id="lr-form" label="Applications started online" checked={s.sources.form} onChange={(form) => setS({ ...s, sources: { ...s.sources, form } })} />
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
          <thead><tr><th style={cell}>Person</th><th style={cell}>In the rotation</th><th style={cell}>Away</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} data-testid="lr-user">
                <td style={cell}>{u.name}</td>
                <td style={cell}><input type="checkbox" aria-label={`${u.name} in the rotation`} checked={s.user_ids.includes(u.id)} onChange={(e) => setS({ ...s, user_ids: e.target.checked ? [...s.user_ids, u.id] : s.user_ids.filter((x) => x !== u.id) })} /></td>
                <td style={cell}><input type="checkbox" aria-label={`${u.name} away`} checked={s.away_user_ids.includes(u.id)} onChange={(e) => setS({ ...s, away_user_ids: e.target.checked ? [...s.away_user_ids, u.id] : s.away_user_ids.filter((x) => x !== u.id) })} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="button" style={{ ...button, marginTop: 8 }} onClick={() => void save()}>Save lead rotation</button>
        <Notice error={err} ok={ok} />
      </Section>
      <Section id="lr-recent" title="Recently assigned">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {recent.length === 0 && <tr><td style={cell}>No leads assigned by rotation yet.</td></tr>}
            {recent.map((r, i) => <tr key={i}><td style={cell}>{when(r.assigned_at)}</td><td style={cell}>{r.contact_name ?? "New lead"}</td><td style={cell}>{name(r.user_id)}</td><td style={cell}>{r.source}</td></tr>)}
          </tbody>
        </table>
      </Section>
    </div>
  );
}
