// BF_PORTAL_TV_SCOREBOARD_v1 - Settings > Screens (Admin): office TVs running the Apple TV scoreboard app. Open the app
// on the TV, type the code it shows here, and choose which teams and screens it rotates through.
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { useTeamOptions } from "@/teams/teamsApi";
import { confirmAction } from "@/lib/confirmAction";
import { getErrorMessage } from "@/utils/errors";
import { listScreens, pairScreen, removeScreen, SLIDE_LABEL, updateScreen, type Screen, type ScreenInput } from "./scoreboardApi";

const input: CSSProperties = { padding: "7px 9px", border: "1px solid var(--ui-border)", borderRadius: 6, fontSize: 13, background: "var(--ui-surface-strong)", color: "var(--ui-text)", minHeight: 36, boxSizing: "border-box" };
const card: CSSProperties = { border: "1px solid var(--ui-border)", borderRadius: 8, padding: 12, background: "var(--ui-surface-strong)", marginBottom: 10 };
const DEFAULT: ScreenInput = { name: "", team_ids: null, slides: ["leaderboard", "teams", "goal", "recent"], rotate_seconds: 20 };

function ScreenForm({ value, onChange, teams }: { value: ScreenInput; onChange: (v: ScreenInput) => void; teams: Array<{ id: string; name: string }> }) {
  const toggleSlide = (s: string) => onChange({ ...value, slides: value.slides.includes(s) ? value.slides.filter((x) => x !== s) : [...value.slides, s] });
  const toggleTeam = (id: string) => {
    const cur = value.team_ids ?? [];
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    onChange({ ...value, team_ids: next.length ? next : null });
  };
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <label style={{ fontSize: 13, display: "grid", gap: 4 }}>Name
        <input style={input} value={value.name} maxLength={80} placeholder="Sales floor" onChange={(e) => onChange({ ...value, name: e.target.value })} aria-label="TV name" />
      </label>
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend style={{ fontSize: 13, marginBottom: 4 }}>Screens to rotate through</legend>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {Object.entries(SLIDE_LABEL).map(([k, label]) => (
            <label key={k} style={{ fontSize: 13, display: "inline-flex", gap: 6, alignItems: "center" }}>
              <input type="checkbox" checked={value.slides.includes(k)} onChange={() => toggleSlide(k)} /> {label}
            </label>
          ))}
        </div>
      </fieldset>
      {teams.length > 0 && (
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ fontSize: 13, marginBottom: 4 }}>Teams shown <span style={{ color: "var(--ui-text-muted)" }}>(none ticked = everyone)</span></legend>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {teams.map((t) => (
              <label key={t.id} style={{ fontSize: 13, display: "inline-flex", gap: 6, alignItems: "center" }}>
                <input type="checkbox" checked={(value.team_ids ?? []).includes(t.id)} onChange={() => toggleTeam(t.id)} /> {t.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <label style={{ fontSize: 13, display: "inline-flex", gap: 8, alignItems: "center" }}>Seconds on each screen
        <input type="number" min={8} max={300} style={{ ...input, width: 90 }} value={value.rotate_seconds} onChange={(e) => onChange({ ...value, rotate_seconds: Number(e.target.value) || 20 })} aria-label="Seconds on each screen" />
      </label>
    </div>
  );
}

const seen = (s: Screen) => s.last_seen_at ? `Last seen ${new Date(s.last_seen_at).toLocaleString()}` : "Not seen yet";

export default function ScreensSettings() {
  const teams = useTeamOptions();
  const [screens, setScreens] = useState<Screen[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [code, setCode] = useState("");
  const [form, setForm] = useState<ScreenInput>(DEFAULT);
  const [editing, setEditing] = useState<string | null>(null);
  const [edit, setEdit] = useState<ScreenInput>(DEFAULT);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setScreens(await listScreens()); } catch (e) { setError(getErrorMessage(e, "Could not load your TVs.")); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function add() {
    setBusy(true); setError(null); setMsg(null);
    try {
      const s = await pairScreen(code, form);
      setMsg(`${s.name} is paired. It will show the scoreboard in a few seconds.`);
      setAdding(false); setCode(""); setForm(DEFAULT); void load();
    } catch (e) { setError(getErrorMessage(e, "That did not work. Check the code on the TV and try again.")); }
    finally { setBusy(false); }
  }
  async function save(id: string) {
    setBusy(true); setError(null);
    try { await updateScreen(id, edit); setEditing(null); void load(); }
    catch (e) { setError(getErrorMessage(e, "Could not save the TV.")); }
    finally { setBusy(false); }
  }
  async function remove(s: Screen) {
    if (!(await confirmAction(`Remove ${s.name}? The TV stops showing the scoreboard until it is paired again.`, { confirmLabel: "Remove", danger: true }))) return;
    try { await removeScreen(s.id); void load(); } catch (e) { setError(getErrorMessage(e, "Could not remove the TV.")); }
  }
  const teamNames = (ids: string[] | null) => !ids?.length ? "Everyone" : ids.map((id) => teams.find((t) => t.id === id)?.name ?? "A team").join(", ");

  return (
    <div data-testid="screens-settings">
      <p style={{ fontSize: 14, color: "var(--ui-text)", margin: "0 0 12px" }}>
        Put the sales scoreboard on an office TV. Install the Keystone TV app on an Apple TV, open it, and enter the code it shows. TVs show broker and team names and amounts only, never client names.
      </p>
      {msg && <div role="status" style={{ fontSize: 13, marginBottom: 8 }}>{msg}</div>}
      {error && <div role="alert" style={{ color: "#b91c1c", fontSize: 13, marginBottom: 8 }}>{error}</div>}
      {adding ? (
        <div style={card}>
          <label style={{ fontSize: 13, display: "grid", gap: 4, marginBottom: 10 }}>Code on the TV
            <input style={{ ...input, fontSize: 22, letterSpacing: 4, textTransform: "uppercase", width: 200 }} value={code} maxLength={7} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ABC234" aria-label="Code on the TV" autoFocus />
          </label>
          <ScreenForm value={form} onChange={setForm} teams={teams} />
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button type="button" className="ui-button" disabled={busy || code.replace(/[\s-]/g, "").length !== 6 || !form.name.trim() || !form.slides.length} onClick={() => void add()}>{busy ? "Pairing…" : "Pair TV"}</button>
            <button type="button" className="ui-button ui-button--secondary" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      ) : <button type="button" className="ui-button" onClick={() => { setAdding(true); setMsg(null); }} style={{ marginBottom: 12 }}>Add a TV</button>}
      {screens && screens.length === 0 && !adding && <p style={{ fontSize: 13, color: "var(--ui-text-muted)" }}>No TVs yet.</p>}
      {(screens ?? []).map((s) => (
        <div key={s.id} style={card} data-testid="screen-row">
          {editing === s.id ? (
            <>
              <ScreenForm value={edit} onChange={setEdit} teams={teams} />
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button type="button" className="ui-button" disabled={busy || !edit.name.trim() || !edit.slides.length} onClick={() => void save(s.id)}>Save</button>
                <button type="button" className="ui-button ui-button--secondary" onClick={() => setEditing(null)}>Cancel</button>
              </div>
            </>
          ) : (
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={{ fontSize: 13 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</div>
                <div>{s.slides.map((x) => SLIDE_LABEL[x] ?? x).join(" · ")} · {s.rotate_seconds}s each</div>
                <div style={{ color: "var(--ui-text-muted)" }}>Teams: {teamNames(s.team_ids)} · {seen(s)}</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <button type="button" className="ui-button ui-button--secondary" onClick={() => { setEditing(s.id); setEdit({ name: s.name, team_ids: s.team_ids, slides: s.slides, rotate_seconds: s.rotate_seconds }); }}>Edit</button>
                <button type="button" className="ui-button ui-button--secondary" onClick={() => void remove(s)}>Remove</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
