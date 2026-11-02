// BF_PORTAL_v870_CRM_DATA_MODEL - Settings > Users & roles > Roles: the built-in roles as read-only templates, and custom
// roles built from a permission matrix - per area View / Create / Edit / Delete / Export, plus which records the
// role sees (all, team, own). A custom role starts from a built-in role and can only take things away from it; the
// boxes the starting role cannot do are greyed out. Only an Admin (the built-in Admin role) can change roles. The
// server enforces every permission; this screen only edits them.
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { card, cell, errorBox, h3, headCell, input, label, muted, okBox, primary, quiet } from "@/crmFields/PropertiesSettings";
import { VISIBILITY_HELP, VISIBILITY_LABEL } from "@/teams/teamsApi";
import {
  ACTION_LABELS, ACTIONS, AREA_LABELS, AREAS, normalizePermissionSet, usePermissions,
  type Action, type Area, type BaseRole, type PermissionSet, type Visibility,
} from "./permissionStore";
import { BUILT_IN_ROLES, createRole, getRoles, setRoleArchived, updateRole, type RoleRow, type RolesOverview } from "./rolesApi";

const VIS: Visibility[] = ["all", "team", "own"];
const errText = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

type Draft = { id: string | null; name: string; description: string; base_role: BaseRole; permissions: PermissionSet; record_visibility: Visibility; users: number };

function templateOf(data: RolesOverview, base: BaseRole): RoleRow | undefined {
  return data.templates.find((t) => t.base_role === base);
}

function countGranted(p: PermissionSet): number {
  return AREAS.reduce((n, a) => n + ACTIONS.filter((x) => p[a]?.[x]).length, 0);
}

export function PermissionMatrix({ value, ceiling, readOnly, onChange, caption }: {
  value: PermissionSet;
  ceiling: PermissionSet | null;
  readOnly: boolean;
  onChange?: (next: PermissionSet) => void;
  caption: string;
}) {
  const toggle = (area: Area, action: Action, on: boolean) => {
    if (!onChange) return;
    const next = normalizePermissionSet(value);
    next[area][action] = on;
    // Doing anything in an area needs seeing it; taking away View takes the rest away too.
    if (on && action !== "view") next[area].view = true;
    if (!on && action === "view") for (const a of ACTIONS) next[area][a] = false;
    onChange(next);
  };
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }} aria-label={caption}>
        <thead>
          <tr>
            <th style={headCell} scope="col">Area</th>
            {ACTIONS.map((a) => <th key={a} style={{ ...headCell, textAlign: "center" }} scope="col">{ACTION_LABELS[a]}</th>)}
          </tr>
        </thead>
        <tbody>
          {AREAS.map((area) => (
            <tr key={area}>
              <th scope="row" style={{ ...cell, fontWeight: 600 }}>{AREA_LABELS[area]}</th>
              {ACTIONS.map((action) => {
                const allowedByBase = !ceiling || ceiling[area][action];
                const checked = value[area]?.[action] === true;
                const name = `${ACTION_LABELS[action]} ${AREA_LABELS[area].toLowerCase()}`;
                return (
                  <td key={action} style={{ ...cell, textAlign: "center" }}>
                    <input
                      type="checkbox"
                      aria-label={name}
                      checked={checked && allowedByBase}
                      disabled={readOnly || !allowedByBase}
                      title={!allowedByBase ? "The role this starts from cannot do this." : undefined}
                      onChange={(e) => toggle(area, action, e.target.checked)}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RoleEditor({ data, draft, onCancel, onSaved, onError }: {
  data: RolesOverview;
  draft: Draft;
  onCancel: () => void;
  onSaved: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [d, setD] = useState<Draft>(draft);
  const [busy, setBusy] = useState(false);
  const ceiling = templateOf(data, d.base_role)?.permissions ?? null;
  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!d.name.trim()) return onError("Give the role a name.");
    setBusy(true);
    try {
      const body = { name: d.name.trim(), description: d.description.trim(), base_role: d.base_role, permissions: d.permissions, record_visibility: d.record_visibility };
      const r = d.id ? await updateRole(d.id, body) : await createRole(body);
      const dropped = Array.isArray(r?.dropped) && r.dropped.length ? ` ${r.dropped.length} permission${r.dropped.length === 1 ? "" : "s"} the starting role does not have were left out.` : "";
      onSaved(`"${body.name}" saved.${d.users ? " People on it get the change within a few seconds." : ""}${dropped}`);
    } catch (e2) {
      onError(errText(e2, "Could not save the role."));
    } finally {
      setBusy(false);
    }
  };
  return (
    <form style={card} onSubmit={save} aria-labelledby="role-editor-h" data-testid="role-editor">
      <h3 id="role-editor-h" style={h3}>{d.id ? `Edit ${draft.name}` : "New role"}</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 12 }}>
        <div>
          <label style={label} htmlFor="role-name">Name</label>
          <input id="role-name" style={input} value={d.name} maxLength={data.limits?.nameChars ?? 60} onChange={(e) => setD({ ...d, name: e.target.value })} />
        </div>
        <div>
          <label style={label} htmlFor="role-base">Starts from</label>
          <select
            id="role-base"
            style={input}
            value={d.base_role}
            disabled={Boolean(d.id && d.users > 0)}
            onChange={(e) => {
              const base = e.target.value as BaseRole;
              const t = templateOf(data, base);
              setD({ ...d, base_role: base, permissions: t ? normalizePermissionSet(t.permissions) : d.permissions });
            }}
          >
            {BUILT_IN_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <span style={{ ...muted, fontSize: 12 }}>
            {d.id && d.users > 0 ? "People are on this role, so its starting role is fixed." : "The role can do at most what this built-in role does."}
          </span>
        </div>
        <div>
          <label style={label} htmlFor="role-vis">Sees</label>
          <select id="role-vis" style={input} value={d.record_visibility} onChange={(e) => setD({ ...d, record_visibility: e.target.value as Visibility })}>
            {VIS.map((v) => <option key={v} value={v}>{VISIBILITY_LABEL[v]}</option>)}
          </select>
          <span style={{ ...muted, fontSize: 12 }}>{VISIBILITY_HELP[d.record_visibility]}</span>
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={label} htmlFor="role-desc">Description (optional)</label>
        <input id="role-desc" style={input} value={d.description} maxLength={data.limits?.descriptionChars ?? 300} onChange={(e) => setD({ ...d, description: e.target.value })} />
      </div>
      <PermissionMatrix value={d.permissions} ceiling={ceiling} readOnly={false} onChange={(p) => setD({ ...d, permissions: p })} caption="Permissions for this role" />
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button type="submit" style={primary} disabled={busy}>{busy ? "Saving…" : d.id ? "Save role" : "Create role"}</button>
        <button type="button" style={quiet} onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

export default function RolesSettings() {
  const [data, setData] = useState<RolesOverview | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const me = usePermissions();
  // Only the built-in Admin role changes roles (the server refuses everyone else).
  const canEdit = me.source !== "server" || me.fullAdmin;

  const load = useCallback(async () => {
    try { setData(await getRoles()); } catch (e) { setErr(errText(e, "Could not load roles.")); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const saved = (msg: string) => { setErr(null); setOk(msg); setDraft(null); void load(); };
  const failed = (msg: string) => { setOk(null); setErr(msg); };

  const startFrom = (t: RoleRow, copy: boolean): Draft => ({
    id: copy ? null : t.id,
    name: copy ? `${t.name} (copy)` : t.name,
    description: copy ? "" : t.description ?? "",
    base_role: t.base_role,
    permissions: normalizePermissionSet(t.permissions),
    record_visibility: t.record_visibility,
    users: copy ? 0 : t.users,
  });

  const archive = async (r: RoleRow) => {
    if (!r.archived_at && !window.confirm(`Archive "${r.name}"? It can no longer be given to anyone.`)) return;
    try { await setRoleArchived(r.id, !r.archived_at); saved(r.archived_at ? `"${r.name}" is active again.` : `"${r.name}" archived.`); }
    catch (e) { failed(errText(e, "Could not change the role.")); }
  };

  const viewed = useMemo(() => [...(data?.templates ?? []), ...(data?.roles ?? [])].find((r) => r.id === viewing) ?? null, [data, viewing]);

  if (!data) return err ? <div role="alert" style={errorBox}>{err}</div> : <p style={muted}>Loading…</p>;

  const row = (r: RoleRow) => (
    <tr key={r.id} data-testid={`role-row-${r.id}`}>
      <td style={cell}>
        <strong>{r.name}</strong>
        {r.built_in && <span style={{ ...muted, margin: "0 0 0 6px" }}>(built-in, read-only)</span>}
        {r.archived_at && <span style={{ ...muted, margin: "0 0 0 6px" }}>(archived)</span>}
        {r.description && <div style={{ ...muted, margin: "2px 0 0" }}>{r.description}</div>}
        {!r.built_in && <div style={{ ...muted, margin: "2px 0 0" }}>Starts from {r.base_role}</div>}
      </td>
      <td style={cell}>{countGranted(r.permissions)} of {AREAS.length * ACTIONS.length}</td>
      <td style={cell}>{VISIBILITY_LABEL[r.record_visibility]}</td>
      <td style={cell}>{r.users}</td>
      <td style={{ ...cell, whiteSpace: "nowrap" }}>
        <button type="button" style={quiet} onClick={() => setViewing(viewing === r.id ? null : r.id)}>{viewing === r.id ? "Hide" : "View"}</button>{" "}
        {canEdit && !r.archived_at && <button type="button" style={quiet} onClick={() => setDraft(startFrom(r, true))}>Copy</button>}{" "}
        {canEdit && !r.built_in && !r.archived_at && <button type="button" style={quiet} onClick={() => setDraft(startFrom(r, false))}>Edit</button>}{" "}
        {canEdit && !r.built_in && <button type="button" style={quiet} onClick={() => void archive(r)}>{r.archived_at ? "Unarchive" : "Archive"}</button>}
      </td>
    </tr>
  );

  return (
    <div>
      {err && <div role="alert" style={errorBox}>{err}</div>}
      {ok && <div role="status" style={okBox}>{ok}</div>}
      <section style={card} aria-labelledby="roles-h">
        <h3 id="roles-h" style={h3}>Roles</h3>
        <p style={muted}>
          A role decides what someone can view, create, edit, delete and export, and which records they see. The built-in
          roles cannot be changed. Custom roles start from a built-in role and can only take things away from it, so
          people on them never get more than that role.
          {!canEdit && " Only an Admin can create or change roles."}
        </p>
        {canEdit && !draft && (
          <button type="button" style={{ ...primary, marginBottom: 12 }} onClick={() => setDraft(startFrom(templateOf(data, "Staff") ?? data.templates[0]!, true))}>
            New role
          </button>
        )}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={headCell}>Role</th><th style={headCell}>Permissions</th><th style={headCell}>Sees</th><th style={headCell}>People</th><th style={headCell}>Actions</th></tr></thead>
            <tbody>
              {data.templates.map(row)}
              {data.roles.map(row)}
            </tbody>
          </table>
        </div>
      </section>
      {viewed && !draft && (
        <section style={card} aria-labelledby="role-view-h">
          <h3 id="role-view-h" style={h3}>{viewed.name}</h3>
          <PermissionMatrix value={viewed.permissions} ceiling={null} readOnly caption={`Permissions for ${viewed.name}`} />
        </section>
      )}
      {draft && <RoleEditor key={draft.id ?? draft.name} data={data} draft={draft} onCancel={() => setDraft(null)} onSaved={saved} onError={failed} />}
    </div>
  );
}
