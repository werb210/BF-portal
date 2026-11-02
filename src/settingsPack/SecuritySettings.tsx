// BF_PORTAL_v869_SETTINGS_PACK_SECURITY - signed-in devices (everyone, in My Profile) and Settings > Security (Admins):
// sign out one device or everywhere, anyone's devices, and "require a passkey or two-step sign-in". BF-Server
// /api/security.
import { useCallback, useEffect, useState } from "react";
import { api } from "@/api";
import { registerPasskey, passkeysSupported } from "@/auth/passkey";
import { Notice, Section, Toggle, cell, danger, errText, input, muted, quiet, when } from "./ui";

type Session = { id: string; device: string; method: string; strong: boolean; ip: string | null; signed_in_at: string; last_active_at: string; current: boolean };
type User = { id: string; name: string };
const METHOD: Record<string, string> = { otp: "Text code", passkey: "Passkey", device: "Face ID (dialler)", sso: "Single sign-on" };

function SessionTable({ sessions, onSignOut }: { sessions: Session[]; onSignOut: (s: Session) => void }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr><th style={cell}>Device</th><th style={cell}>Signed in with</th><th style={cell}>Signed in</th><th style={cell}>Last active</th><th style={cell}>IP address</th><th style={cell} /></tr></thead>
        <tbody>
          {sessions.length === 0 && <tr><td style={cell} colSpan={6}>No signed-in devices.</td></tr>}
          {sessions.map((s) => (
            <tr key={s.id} data-testid="session-row">
              <td style={cell}>{s.device}{s.current ? " (this device)" : ""}</td>
              <td style={cell}>{METHOD[s.method] ?? s.method}{s.method === "otp" && s.strong ? " + passkey" : ""}</td>
              <td style={cell}>{when(s.signed_in_at)}</td><td style={cell}>{when(s.last_active_at)}</td><td style={cell}>{s.ip ?? ""}</td>
              <td style={cell}>{!s.current && <button type="button" style={quiet} onClick={() => onSignOut(s)}>Sign out</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** My Profile: my devices. */
export function MySessions() {
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const load = useCallback(async () => {
    try { setSessions((await api.get<{ sessions: Session[] }>("/api/security/me/sessions")).sessions); } catch (e) { setErr(errText(e, "Could not load your devices.")); setSessions([]); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const signOut = async (s: Session) => {
    try { await api.post(`/api/security/me/sessions/${s.id}/sign-out`, {}); setOk(`${s.device} is signed out.`); await load(); } catch (e) { setErr(errText(e, "Could not sign it out.")); }
  };
  const everywhere = async () => {
    if (!window.confirm("Sign out of every device, including this one?")) return;
    try { await api.post("/api/security/me/sign-out-everywhere", {}); window.location.assign("/login"); } catch (e) { setErr(errText(e, "Could not sign out everywhere.")); }
  };
  return (
    <Section id="my-sessions" title="Signed-in devices" intro="Every browser, iPad and phone signed in to your account. Sign out any you don't recognise.">
      {sessions ? <SessionTable sessions={sessions} onSignOut={(s) => void signOut(s)} /> : <p style={muted}>Loading...</p>}
      <button type="button" style={{ ...danger, marginTop: 8 }} onClick={() => void everywhere()}>Sign out everywhere</button>
      <Notice error={err} ok={ok} />
    </Section>
  );
}

type Readiness = { with_passkey: number; staff: number; admins_without_passkey: User[] };

export default function SecuritySettings() {
  const [required, setRequired] = useState(false);
  const [strong, setStrong] = useState(false);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [who, setWho] = useState("");
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api.get<{ require_strong_sign_in: boolean; session_strong: boolean; readiness: Readiness; users?: User[] }>("/api/security/settings");
      setRequired(r.require_strong_sign_in); setStrong(r.session_strong); setReadiness(r.readiness); setUsers(r.users ?? []);
    } catch (e) { setErr(errText(e, "Could not load the security settings.")); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const loadUser = useCallback(async (id: string) => {
    setWho(id); setSessions(null);
    if (!id) return;
    try { setSessions((await api.get<{ sessions: Session[] }>(`/api/security/users/${id}/sessions`)).sessions); } catch (e) { setErr(errText(e, "Could not load their devices.")); }
  }, []);

  const setSwitch = async (on: boolean) => {
    setErr(null); setOk(null);
    try { await api.put("/api/security/settings", { require_strong_sign_in: on }); setRequired(on); setOk(on ? "Staff now need a passkey (or a text code plus a passkey) to use the portal." : "Passkeys are optional again."); }
    catch (e) { setErr(errText(e, "Could not change the setting.")); }
  };
  const addPasskey = async () => {
    try { await registerPasskey(); setOk("Passkey added. This session now counts as two-step."); await load(); } catch (e) { setErr(errText(e, "Could not add a passkey.")); }
  };

  return (
    <div data-testid="security-settings">
      <Section id="sec-require" title="Require a passkey or two-step sign-in" intro="When on, a text code alone is not enough: staff sign in with a passkey, Face ID on the dialler, or single sign-on, or add a passkey after the text code. Anyone without one can still sign in and set one up, so nobody is locked out.">
        {readiness && <p style={muted}>{readiness.with_passkey} of {readiness.staff} staff have a passkey.{readiness.admins_without_passkey.length ? ` Admins without one: ${readiness.admins_without_passkey.map((a) => a.name).join(", ")}.` : ""}</p>}
        {!strong && !required && (
          <p style={muted}>To switch this on, first sign in with your passkey or add one now. {passkeysSupported() && <button type="button" style={quiet} onClick={() => void addPasskey()}>Add a passkey</button>}</p>
        )}
        <Toggle id="sec-require-on" label="Require a passkey or two-step sign-in for all staff" checked={required} disabled={!required && !strong} onChange={(v) => void setSwitch(v)} />
      </Section>
      <Section id="sec-users" title="Anyone's devices" intro="See where a team member is signed in, and sign out a lost or shared device, or everything (for example when someone leaves).">
        <select aria-label="Team member" value={who} onChange={(e) => void loadUser(e.target.value)} style={{ ...input, maxWidth: 320 }}>
          <option value="">Choose a team member</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        {who && sessions && <>
          <SessionTable sessions={sessions} onSignOut={async (s) => { try { await api.post(`/api/security/users/${who}/sessions/${s.id}/sign-out`, {}); await loadUser(who); } catch (e) { setErr(errText(e, "Could not sign it out.")); } }} />
          <button type="button" style={{ ...danger, marginTop: 8 }} onClick={async () => {
            if (!window.confirm("Sign this person out of every device?")) return;
            try { await api.post(`/api/security/users/${who}/sign-out-everywhere`, {}); setOk("Signed out everywhere."); await loadUser(who); } catch (e) { setErr(errText(e, "Could not sign them out.")); }
          }}>Sign out everywhere</button>
        </>}
      </Section>
      <Notice error={err} ok={ok} />
    </div>
  );
}
