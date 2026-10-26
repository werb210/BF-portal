// BF_PORTAL_v856_CRM_UNIFY - the shared tag UI every CRM list and record uses (modelled on the BI CRM):
//   CrmTagViewBy      "View by:" chips - All, Untagged, each staff tag, then the automatic (system) tags in grey
//   CrmBulkTagActions bulk "Tag as..." and "Remove tag" (Active included) for the ticked rows
//   CrmTagEditor      Edit tags on one contact or company; system tags show grey and locked
//   CrmTagChips       how tags look in lists: staff tags blue (Active green), system tags grey
//   ManageTags        Admins add or remove this silo's own extra tags (the shared list is fixed)
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  CORE_TAGS, crmUnified, errorText, normalizeTag, staffTagOptions, tagKindOf, tagLabel,
  type CrmBackend, type CrmEntity, type TagCatalogue,
} from "./crmUnifiedApi";

export const UNTAGGED = "__none__";

export function useTagCatalogue(backend: CrmBackend, refreshKey = 0) {
  const [catalogue, setCatalogue] = useState<TagCatalogue | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    crmUnified(backend).tags().then((c) => { if (alive) setCatalogue(c); }).catch(() => { if (alive) setCatalogue(null); });
    return () => { alive = false; };
  }, [backend, refreshKey, tick]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { catalogue, reload };
}

const chipBase: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, padding: "2px 8px", borderRadius: 999, whiteSpace: "nowrap", lineHeight: "16px" };
// Fixed light pairs with at least 7:1 contrast, readable on both portal themes.
const STYLE: Record<string, CSSProperties> = {
  staff: { ...chipBase, background: "#dbeafe", color: "#1e3a8a", border: "1px solid #bfdbfe" },
  active: { ...chipBase, background: "#dcfce7", color: "#14532d", border: "1px solid #bbf7d0", fontWeight: 600 },
  system: { ...chipBase, background: "#e5e7eb", color: "#374151", border: "1px dashed #9ca3af" },
};

export function CrmTagChip({ tag, catalogue, onRemove }: { tag: string; catalogue?: TagCatalogue | null; onRemove?: () => void }) {
  const kind = tagKindOf(tag, catalogue);
  const slug = normalizeTag(tag);
  // Shared and silo tags show their label; older free-text tags show as they were written.
  const text = kind === "other" ? tag : tagLabel(tag, catalogue);
  const style = kind === "system" ? STYLE.system : slug === "active" ? STYLE.active : STYLE.staff;
  return (
    <span style={style} data-testid="crm-tag-chip" data-kind={kind} title={kind === "system" ? "Set automatically" : "Staff tag"}>
      {text}
      {onRemove && kind !== "system" ? (
        <button type="button" onClick={onRemove} aria-label={`Remove tag ${text}`}
          style={{ border: 0, background: "transparent", color: "inherit", cursor: "pointer", padding: 0, fontSize: 12, lineHeight: "12px" }}>x</button>
      ) : null}
    </span>
  );
}

export function CrmTagChips({ tags, catalogue }: { tags: string[] | null | undefined; catalogue?: TagCatalogue | null }) {
  const byKey = new Map<string, string>();
  for (const raw of tags ?? []) { const k = normalizeTag(raw); if (k && !byKey.has(k)) byKey.set(k, String(raw).trim()); }
  const list = Array.from(byKey.values());
  if (!list.length) return <>{"-"}</>;
  const staff = list.filter((t) => tagKindOf(t, catalogue) !== "system");
  const system = list.filter((t) => tagKindOf(t, catalogue) === "system");
  return (
    <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 4 }}>
      {[...staff, ...system].map((t) => <CrmTagChip key={t} tag={t} catalogue={catalogue} />)}
    </span>
  );
}

const viewChip = (active: boolean, system = false): CSSProperties => ({
  fontSize: 12, padding: "3px 10px", borderRadius: 999, cursor: "pointer", whiteSpace: "nowrap",
  border: active ? "1px solid #1d4ed8" : system ? "1px dashed #9ca3af" : "1px solid var(--ui-border)",
  background: active ? "#1d4ed8" : system ? "#f3f4f6" : "var(--ui-surface-strong)",
  color: active ? "#ffffff" : system ? "#374151" : "var(--ui-text)",
});

/** "View by" chips. `value` is the selected tags (any of); UNTAGGED means records with no staff tags. */
export function CrmTagViewBy({ backend, entity, value, onChange, catalogue, onCatalogueChanged }: {
  backend: CrmBackend; entity: CrmEntity; value: string[]; onChange: (next: string[]) => void;
  catalogue: TagCatalogue | null; onCatalogueChanged?: () => void;
}) {
  const { user } = useAuth();
  const isAdmin = String(user?.role ?? "").toLowerCase() === "admin";
  const [manage, setManage] = useState(false);
  const selected = new Set(value);
  const toggle = (t: string) => {
    const next = new Set(selected);
    if (next.has(t)) next.delete(t); else next.add(t);
    onChange(Array.from(next));
  };
  const count = (t: string) => {
    const u = catalogue?.inUse.find((x) => x.tag === t);
    return u ? (entity === "contact" ? u.contacts : u.companies) : 0;
  };
  const staff = staffTagOptions(catalogue);
  const system = (catalogue?.inUse ?? []).filter((t) => t.kind === "system" && count(t.tag) > 0).map((t) => t.tag);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "0 0 10px", alignItems: "center" }} data-testid="crm-view-by">
      <span style={{ fontSize: 12, color: "var(--ui-text-muted)", marginRight: 2 }}>View by:</span>
      <button type="button" onClick={() => onChange([])} style={viewChip(selected.size === 0)} aria-pressed={selected.size === 0}>All</button>
      <button type="button" onClick={() => toggle(UNTAGGED)} style={viewChip(selected.has(UNTAGGED))} aria-pressed={selected.has(UNTAGGED)}
        title="No staff tags (automatic tags alone still count as untagged)">Untagged</button>
      {staff.map((t) => (
        <button key={t.slug} type="button" onClick={() => toggle(t.slug)} style={viewChip(selected.has(t.slug))} aria-pressed={selected.has(t.slug)}>
          {t.label}{catalogue ? ` (${count(t.slug)})` : ""}
        </button>
      ))}
      {system.length > 0 && <span style={{ fontSize: 11, color: "var(--ui-text-muted)", margin: "0 2px 0 8px" }}>Automatic:</span>}
      {system.map((t) => (
        <button key={t} type="button" onClick={() => toggle(t)} style={viewChip(selected.has(t), true)} aria-pressed={selected.has(t)} title="Set automatically">
          {t} ({count(t)})
        </button>
      ))}
      {isAdmin && (
        <button type="button" onClick={() => setManage(true)} style={{ ...viewChip(false), borderStyle: "dotted" }}>Manage tags</button>
      )}
      {manage && <ManageTags backend={backend} catalogue={catalogue} onClose={() => setManage(false)} onChanged={() => onCatalogueChanged?.()} />}
    </div>
  );
}

const barSelect: CSSProperties = { padding: "6px 10px", border: "1px solid var(--ui-border)", borderRadius: 6, fontSize: 13, background: "var(--ui-surface-strong)", color: "var(--ui-text)" };

/** Bulk "Tag as..." and "Remove tag" for the ticked rows. */
export function CrmBulkTagActions({ backend, entity, ids, catalogue, onDone }: {
  backend: CrmBackend; entity: CrmEntity; ids: string[]; catalogue: TagCatalogue | null; onDone: () => void;
}) {
  const [busy, setBusy] = useState<"add" | "remove" | null>(null);
  const options = staffTagOptions(catalogue);
  async function run(kind: "add" | "remove", slug: string) {
    if (!slug || !ids.length) return;
    setBusy(kind);
    try {
      await crmUnified(backend).applyTags(entity, ids, kind === "add" ? [slug] : [], kind === "remove" ? [slug] : []);
      onDone();
    } catch (err) {
      window.alert(errorText(err, kind === "add" ? "Tagging failed." : "Removing the tag failed."));
    } finally {
      setBusy(null);
    }
  }
  return (
    <>
      <select value="" disabled={busy !== null} onChange={(e) => void run("add", e.target.value)} style={barSelect} aria-label="Tag as" data-testid="crm-bulk-tag-as">
        <option value="">{busy === "add" ? "Tagging..." : "Tag as..."}</option>
        {options.map((o) => <option key={o.slug} value={o.slug}>{o.label}</option>)}
      </select>
      <select value="" disabled={busy !== null} onChange={(e) => void run("remove", e.target.value)} style={barSelect} aria-label="Remove tag" data-testid="crm-bulk-remove-tag">
        <option value="">{busy === "remove" ? "Removing..." : "Remove tag..."}</option>
        {options.map((o) => <option key={o.slug} value={o.slug}>{o.label}</option>)}
      </select>
    </>
  );
}

/** Edit tags on one record: staff tags can be added and removed; automatic tags are shown grey and locked. */
export function CrmTagEditor({ backend, entity, id, tags, catalogue, onSaved }: {
  backend: CrmBackend; entity: CrmEntity; id: string; tags: string[] | null | undefined; catalogue: TagCatalogue | null; onSaved: () => void;
}) {
  const current = Array.from(new Map((tags ?? []).map((t) => [normalizeTag(t), String(t).trim()] as const).filter(([k]) => k)).values());
  const currentKeys = current.map(normalizeTag);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const staffOptions = staffTagOptions(catalogue).filter((o) => !currentKeys.includes(o.slug));
  async function change(add: string[], remove: string[]) {
    setBusy(true); setErr(null);
    try {
      await crmUnified(backend).applyTags(entity, [id], add, remove);
      onSaved();
    } catch (e) {
      setErr(errorText(e, "Could not save tags."));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div style={{ marginTop: 12 }} data-testid="crm-tag-editor">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 11, color: "var(--ui-text-muted)", textTransform: "uppercase" }}>Tags</div>
        <button type="button" onClick={() => setEditing((v) => !v)} aria-label="Edit tags"
          style={{ fontSize: 12, border: "1px solid var(--ui-border)", borderRadius: 6, padding: "2px 8px", background: "var(--ui-surface-strong)", color: "var(--ui-text)", cursor: "pointer" }}>
          {editing ? "Done" : "Edit"}
        </button>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
        {current.length === 0 && <span style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>No tags</span>}
        {current.map((t) => (
          <CrmTagChip key={t} tag={t} catalogue={catalogue} onRemove={editing && !busy ? () => void change([], [normalizeTag(t)]) : undefined} />
        ))}
      </div>
      {editing && (
        <div style={{ marginTop: 8 }}>
          <select value="" disabled={busy} onChange={(e) => { if (e.target.value) void change([e.target.value], []); }} style={{ ...barSelect, width: "100%" }} aria-label="Add a tag">
            <option value="">{busy ? "Saving..." : "Add a tag..."}</option>
            {staffOptions.map((o) => <option key={o.slug} value={o.slug}>{o.label}</option>)}
          </select>
          <div style={{ fontSize: 11, color: "var(--ui-text-muted)", marginTop: 4 }}>Grey tags are set automatically and cannot be changed here.</div>
        </div>
      )}
      {err && <div role="alert" style={{ color: "#b91c1c", fontSize: 12, marginTop: 4 }}>{err}</div>}
    </div>
  );
}

export function ManageTags({ backend, catalogue, onClose, onChanged }: { backend: CrmBackend; catalogue: TagCatalogue | null; onClose: () => void; onChanged: () => void }) {
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const api = crmUnified(backend);
  async function add() {
    if (!label.trim()) return;
    setBusy(true); setErr(null);
    try { await api.addTagDefinition(label.trim()); setLabel(""); onChanged(); } catch (e) { setErr(errorText(e, "Could not add the tag.")); } finally { setBusy(false); }
  }
  async function remove(slug: string) {
    if (!window.confirm("Remove this tag from the list? Records keep it until it is removed from them.")) return;
    setBusy(true); setErr(null);
    try { await api.removeTagDefinition(slug); onChanged(); } catch (e) { setErr(errorText(e, "Could not remove the tag.")); } finally { setBusy(false); }
  }
  return (
    <div role="dialog" aria-label="Manage tags" onClick={onClose} style={overlay}>
      <div onClick={(e) => e.stopPropagation()} style={dialog}>
        <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>Tags</h3>
        <div style={{ fontSize: 12, color: "var(--ui-text-muted)", marginBottom: 6 }}>Shared by every silo:</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
          {CORE_TAGS.map((t) => <CrmTagChip key={t.slug} tag={t.slug} />)}
        </div>
        <div style={{ fontSize: 12, color: "var(--ui-text-muted)", marginBottom: 6 }}>This silo's own tags:</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
          {(catalogue?.custom ?? []).length === 0 && <span style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>None yet</span>}
          {(catalogue?.custom ?? []).map((t) => <CrmTagChip key={t.slug} tag={t.slug} catalogue={catalogue} onRemove={busy ? undefined : () => void remove(t.slug)} />)}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="New tag, e.g. Insurance agent" aria-label="New tag"
            style={{ flex: 1, padding: "6px 10px", border: "1px solid var(--ui-border)", borderRadius: 6, background: "var(--ui-surface-strong)", color: "var(--ui-text)" }} />
          <button type="button" disabled={busy || !label.trim()} onClick={() => void add()} style={primaryBtn}>Add</button>
        </div>
        {err && <div role="alert" style={{ color: "#b91c1c", fontSize: 12, marginTop: 6 }}>{err}</div>}
        <div style={{ textAlign: "right", marginTop: 12 }}><button type="button" onClick={onClose} style={plainBtn}>Close</button></div>
      </div>
    </div>
  );
}

export const overlay: CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 };
export const dialog: CSSProperties = { background: "var(--ui-surface-strong)", color: "var(--ui-text)", border: "1px solid var(--ui-border)", borderRadius: 10, padding: 20, width: 480, maxWidth: "92vw", maxHeight: "86vh", overflow: "auto" };
export const primaryBtn: CSSProperties = { padding: "6px 14px", borderRadius: 6, border: 0, background: "#1d4ed8", color: "#ffffff", fontWeight: 600, cursor: "pointer", fontSize: 13 };
export const plainBtn: CSSProperties = { padding: "6px 12px", borderRadius: 6, border: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)", color: "var(--ui-text)", cursor: "pointer", fontSize: 13 };
export const dangerBtn: CSSProperties = { padding: "4px 10px", borderRadius: 6, border: "1px solid #fecaca", background: "var(--ui-surface-strong)", color: "#b91c1c", cursor: "pointer", fontSize: 12 };
