// BF_PORTAL_v870_CRM_DATA_MODEL - Settings > Teams (Admins, growth and up): teams, who is on them, each person's primary team, and
// who sees which records (per role, with a per-person override). Admins always see everything; the default is All
// records, so nothing changes until a setting is changed here. The server enforces it on every list, search, record,
// export, report and assistant answer.
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { card, cell, errorBox, h3, headCell, input, label, muted, okBox, primary, quiet } from "@/crmFields/PropertiesSettings";
import {
  createTeam, getTeams, renameTeam, setRoleVisibility, setTeamArchived, setTeamMembers, updateTeamUser, userName,
  VISIBILITY_HELP, VISIBILITY_LABEL, type Team, type TeamsOverview, type Visibility,
} from "./teamsApi";

const VIS: Visibility[] = ["all", "team", "own"];
const errText = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

function RoleVisibility({ data, onSaved }: { data: TeamsOverview; onSaved: (msg: string) => void }) {
  const [vals, setVals] = useState<Record<string, Visibility>>(data.role_visibility);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try { await setRoleVisibility(vals); onSaved("Record visibility saved. It applies within a few seconds."); }
    catch (e2) { setErr(errText(e2, "Could not save.")); }
    finally { setBusy(false); }
  };
  return (
    <form style={card} onSubmit={save} aria-labelledby="vis-h">
      <h3 id="vis-h" style={h3}>Who sees which records</h3>
      <p style={muted}>
        Choose what each role sees in contacts, companies and the pipeline, and everywhere they appear: search, record pages,
        exports, reports and the assistant. Admins always see everything. A person's own setting below overrides their role.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        {data.roles.map((role) => (
          <div key={role}>
            <label style={label} htmlFor={`vis-${role}`}>{role}</label>
            <select id={`vis-${role}`} style={input} value={vals[role] ?? "all"} onChange={(e) => setVals((p) => ({ ...p, [role]: e.target.value as Visibility }))}>
              {VIS.map((v) => <option key={v} value={v}>{VISIBILITY_LABEL[v]}</option>)}
            </select>
            <span style={{ ...muted, fontSize: 12 }}>{VISIBILITY_HELP[vals[role] ?? "all"]}</span>
          </div>
        ))}
      </div>
      {err && <div role="alert" style={errorBox}>{err}</div>}
      <button type="submit" style={{ ...primary, marginTop: 12 }} disabled={busy}>{busy ? "Saving…" : "Save"}</button>
    </form>
  );
}

function TeamRow({ team, data, onChanged, onError }: { team: Team; data: TeamsOverview; onChanged: (msg: string) => void; onError: (msg: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(team.name);
  const [members, setMembers] = useState<Set<string>>(new Set(team.members.map((m) => m.user_id)));
  const memberNames = data.users.filter((u) => team.members.some((m) => m.user_id === u.id)).map(userName);
  const save = async () => {
    try {
      if (name.trim() !== team.name) await renameTeam(team.id, { name: name.trim() });
      await setTeamMembers(team.id, [...members]);
      setEditing(false);
      onChanged(`"${name.trim()}" saved.`);
    } catch (e) { onError(errText(e, "Could not save the team.")); }
  };
  const archive = async () => {
    if (!team.archived_at && !window.confirm(`Archive "${team.name}"? Its members stop seeing each other's records through it.`)) return;
    try { await setTeamArchived(team.id, !team.archived_at); onChanged(team.archived_at ? `"${team.name}" is active again.` : `"${team.name}" archived.`); }
    catch (e) { onError(errText(e, "Could not change the team.")); }
  };
  return (
    <tr data-testid={`team-row-${team.id}`}>
      <td style={cell}>
        {editing ? <input aria-label="Team name" style={input} value={name} onChange={(e) => setName(e.target.value)} /> : <strong>{team.name}</strong>}
        {team.archived_at && <span style={{ ...muted, margin: "0 0 0 6px" }}>(archived)</span>}
      </td>
      <td style={cell}>
        {editing ? (
          <div role="group" aria-label={`Members of ${team.name}`} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {data.users.map((u) => (
              <label key={u.id} style={{ fontSize: 13, color: "var(--ui-text)", display: "inline-flex", gap: 6, alignItems: "center" }}>
                <input type="checkbox" checked={members.has(u.id)} onChange={(e) => setMembers((p) => { const n = new Set(p); if (e.target.checked) n.add(u.id); else n.delete(u.id); return n; })} />
                {userName(u)} <span style={{ color: "var(--ui-text-muted)" }}>({u.role ?? "Staff"})</span>
              </label>
            ))}
          </div>
        ) : memberNames.length ? memberNames.join(", ") : <span style={{ color: "var(--ui-text-muted)" }}>No members yet</span>}
      </td>
      <td style={{ ...cell, whiteSpace: "nowrap" }}>
        {editing ? (
          <><button type="button" style={primary} onClick={() => void save()}>Save</button>{" "}<button type="button" style={quiet} onClick={() => setEditing(false)}>Cancel</button></>
        ) : (
          <>{!team.archived_at && <button type="button" style={quiet} onClick={() => setEditing(true)}>Edit</button>}{" "}<button type="button" style={quiet} onClick={() => void archive()}>{team.archived_at ? "Unarchive" : "Archive"}</button></>
        )}
      </td>
    </tr>
  );
}

export default function TeamsSettings() {
  const [data, setData] = useState<TeamsOverview | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  const load = useCallback(async () => {
    try { setData(await getTeams()); } catch (e) { setErr(errText(e, "Could not load teams.")); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const changed = (msg: string) => { setErr(null); setOk(msg); void load(); };
  const failed = (msg: string) => { setOk(null); setErr(msg); };

  const addTeam = async (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return failed("Give the team a name.");
    try { await createTeam(newName.trim()); setNewName(""); changed("Team created. Edit it to add people."); }
    catch (e2) { failed(errText(e2, "Could not create the team.")); }
  };

  const setUser = async (userId: string, body: Parameters<typeof updateTeamUser>[1]) => {
    try { await updateTeamUser(userId, body); changed("Saved."); } catch (e) { failed(errText(e, "Could not save.")); }
  };

  if (!data) return err ? <div role="alert" style={errorBox}>{err}</div> : <p style={muted}>Loading…</p>;
  const activeTeams = data.teams.filter((t) => !t.archived_at);

  return (
    <div>
      {err && <div role="alert" style={errorBox}>{err}</div>}
      {ok && <div role="status" style={okBox}>{ok}</div>}
      <RoleVisibility key={JSON.stringify(data.role_visibility)} data={data} onSaved={changed} />

      <section style={card} aria-labelledby="teams-h">
        <h3 id="teams-h" style={h3}>Teams</h3>
        <p style={muted}>Group people (for example by office or by product). Teams decide what "Team's records" means and can filter the pipeline and reports.</p>
        <form onSubmit={addTeam} style={{ display: "flex", gap: 8, marginBottom: 12, maxWidth: 480 }}>
          <input aria-label="New team name" style={input} placeholder="New team name" value={newName} maxLength={80} onChange={(e) => setNewName(e.target.value)} />
          <button type="submit" style={primary}>Add team</button>
        </form>
        {data.teams.length === 0 ? <p style={muted}>No teams yet.</p> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={headCell}>Team</th><th style={headCell}>Members</th><th style={headCell}>Actions</th></tr></thead>
              <tbody>{data.teams.map((t) => <TeamRow key={t.id} team={t} data={data} onChanged={changed} onError={failed} />)}</tbody>
            </table>
          </div>
        )}
      </section>

      <section style={card} aria-labelledby="people-h">
        <h3 id="people-h" style={h3}>People</h3>
        <p style={muted}>Each person's primary team (used for team reports) and, if needed, a visibility that overrides their role.</p>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={headCell}>Person</th><th style={headCell}>Role</th><th style={headCell}>Teams</th><th style={headCell}>Primary team</th><th style={headCell}>Sees</th></tr></thead>
            <tbody>
              {data.users.map((u) => {
                const isAdmin = String(u.role ?? "").toLowerCase() === "admin";
                const roleVis = data.role_visibility[u.role ?? ""] ?? "all";
                const myTeams = activeTeams.filter((t) => u.team_ids.includes(t.id));
                return (
                  <tr key={u.id} data-testid={`team-user-${u.id}`}>
                    <td style={cell}><strong>{userName(u)}</strong><div style={{ ...muted, margin: 0 }}>{u.email}</div></td>
                    <td style={cell}>{u.role ?? "Staff"}</td>
                    <td style={cell}>{myTeams.length ? myTeams.map((t) => t.name).join(", ") : <span style={{ color: "var(--ui-text-muted)" }}>None</span>}</td>
                    <td style={cell}>
                      <select aria-label={`Primary team for ${userName(u)}`} style={input} value={u.primary_team_id ?? ""} disabled={!myTeams.length}
                        onChange={(e) => void setUser(u.id, { primary_team_id: e.target.value || null })}>
                        <option value="">None</option>
                        {myTeams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </td>
                    <td style={cell}>
                      {isAdmin ? <span>All records (Admin)</span> : (
                        <select aria-label={`Visibility for ${userName(u)}`} style={input} value={u.record_visibility ?? ""}
                          onChange={(e) => void setUser(u.id, { record_visibility: (e.target.value || null) as Visibility | null })}>
                          <option value="">Same as role ({VISIBILITY_LABEL[roleVis]})</option>
                          {VIS.map((v) => <option key={v} value={v}>{VISIBILITY_LABEL[v]}</option>)}
                        </select>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
