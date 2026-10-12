// BF_PORTAL_v789_BI_CONTACT_CARD - the BI contact card's own feeds, all read from BI-Server.
//   BIContactCommsFeed  - email and call activity (GET /api/v1/bi/crm/contacts/:id/activity). It replaces
//                         the BF ContactEmailFeed/ContactCallFeed, which read BF-Server's CRM by a BI id.
//   BIContactTimeline   - the full timeline (GET /api/v1/bi/crm/contacts/:id/timeline).
//   BIContactDocuments  - documents filed against the contact (GET /api/v1/bi/crm/contacts/:id/documents).
//   BIContactDuplicates - likely duplicates and merge (GET .../duplicates, POST .../merge {duplicate_id}).
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { api } from "@/api";
import { normalizeBiActivity, type BiActivityRow } from "@/api/biCrmActivity";
import { openAuthedFile } from "@/lib/authedMedia";

const base = (contactId: string) => `/api/v1/bi/crm/contacts/${encodeURIComponent(contactId)}`;

function listOf(raw: unknown, ...keys: string[]): Record<string, unknown>[] {
  const r = raw as Record<string, unknown> | unknown[] | null;
  let list: unknown = Array.isArray(r) ? r : null;
  for (const k of keys) {
    if (list) break;
    const v = (r as Record<string, unknown> | null)?.[k];
    if (Array.isArray(v)) list = v;
  }
  if (!list && r && typeof r === "object" && !Array.isArray(r)) {
    const d = (r as { data?: unknown }).data;
    if (Array.isArray(d)) list = d;
    else if (d && typeof d === "object") return listOf(d, ...keys);
  }
  return (Array.isArray(list) ? list : []).filter((x): x is Record<string, unknown> => !!x && typeof x === "object");
}

const text = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);
const when = (v: unknown): string => {
  const t = typeof v === "string" ? Date.parse(v) : NaN;
  return Number.isNaN(t) ? "" : new Date(t).toLocaleString();
};

function useBiList<T>(path: string | null, map: (raw: unknown) => T[], refreshKey?: number) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    api(path)
      .then((r) => { if (!cancelled) setItems(map(r)); })
      .catch((e: unknown) => {
        if (cancelled) return;
        setItems([]);
        setError(e instanceof Error ? e.message : "Could not load.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [path, map, refreshKey, tick]); // `map` is a module-level function at every call site, so it is stable.
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { items, loading, error, reload };
}

function Panel({ title, testId, children }: { title: string; testId: string; children: ReactNode }) {
  return (
    <section data-testid={testId} style={panel}>
      <h3 style={{ marginTop: 0, fontSize: 15, color: "var(--ui-text)" }}>{title}</h3>
      {children}
    </section>
  );
}

function Status({ loading, error, empty, emptyText }: { loading: boolean; error: string | null; empty: boolean; emptyText: string }) {
  if (loading) return <div style={muted}>Loading...</div>;
  if (error) return <div role="alert" style={{ ...muted, color: "var(--ui-text-danger)" }}>{error}</div>;
  if (empty) return <div style={muted}>{emptyText}</div>;
  return null;
}

// ---------------------------------------------------------------- comms feed (item 79)

const commsRows = (raw: unknown) => normalizeBiActivity(raw).filter((r) => r.event_type === "email" || r.event_type === "call");

function metaText(row: BiActivityRow, key: string): string | null {
  return text(row.meta?.[key]);
}

export function BIContactCommsFeed({ contactId, refreshKey }: { contactId: string; refreshKey?: number }) {
  const { items, loading, error } = useBiList(`${base(contactId)}/activity`, commsRows, refreshKey);
  return (
    <Panel title="Emails and calls" testId="bi-contact-comms-feed">
      <Status loading={loading} error={error} empty={items.length === 0} emptyText="No emails or calls logged yet." />
      {items.map((row) => {
        const isEmail = row.event_type === "email";
        const direction = metaText(row, "direction");
        const subject = metaText(row, "subject");
        const duration = Number(row.meta?.duration_sec ?? 0);
        return (
          <article key={row.id} data-testid={`bi-comms-${row.event_type}`} style={item}>
            <header style={itemHeader}>
              <span style={badge}>{isEmail ? "Email" : "Call"}{direction ? ` - ${direction}` : ""}</span>
              <time style={muted}>{when(row.created_at)}</time>
            </header>
            {isEmail && <div style={{ fontWeight: 600, color: "var(--ui-text)" }}>{subject ?? "(no subject)"}</div>}
            {!isEmail && (row.outcome || duration > 0) && (
              <div style={{ color: "var(--ui-text)" }}>
                {row.outcome ? row.outcome.replace(/_/g, " ") : ""}
                {duration > 0 ? `${row.outcome ? " - " : ""}${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, "0")}` : ""}
              </div>
            )}
            {row.body && <div style={{ ...muted, whiteSpace: "pre-wrap", marginTop: 4 }}>{row.body}</div>}
            {row.actor_name && <div style={{ ...muted, marginTop: 4 }}>{row.actor_name}</div>}
          </article>
        );
      })}
    </Panel>
  );
}

// ---------------------------------------------------------------- timeline (item 90)

type TimelineEntry = { id: string; kind: string; title: string | null; body: string | null; at: string; actor: string | null };

function timelineRows(raw: unknown): TimelineEntry[] {
  return listOf(raw, "items", "events", "timeline")
    .map((r, i) => ({
      id: String(r.id ?? `t-${i}`),
      kind: String(r.kind ?? r.event_type ?? r.type ?? "activity").toLowerCase(),
      title: text(r.title) ?? text(r.subject),
      body: text(r.body) ?? text(r.summary),
      at: String(r.ts ?? r.occurred_at ?? r.created_at ?? ""),
      actor: text(r.actor_name) ?? text(r.staff_name),
    }))
    .sort((a, b) => (Date.parse(b.at) || 0) - (Date.parse(a.at) || 0));
}

export function BIContactTimeline({ contactId, refreshKey }: { contactId: string; refreshKey?: number }) {
  const { items, loading, error } = useBiList(`${base(contactId)}/timeline`, timelineRows, refreshKey);
  const [filter, setFilter] = useState("all");
  const kinds = useMemo(() => Array.from(new Set(items.map((i) => i.kind))).sort(), [items]);
  const shown = filter === "all" ? items : items.filter((i) => i.kind === filter);
  return (
    <Panel title="Timeline" testId="bi-contact-timeline">
      {kinds.length > 1 && (
        <div role="tablist" aria-label="Timeline filter" style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
          {["all", ...kinds].map((k) => (
            <button key={k} type="button" role="tab" aria-selected={filter === k} onClick={() => setFilter(k)} style={tab(filter === k)}>
              {k === "all" ? "All" : k.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      )}
      <Status loading={loading} error={error} empty={shown.length === 0} emptyText="No activity yet." />
      {shown.map((e) => (
        <article key={e.id} data-testid="bi-timeline-item" style={item}>
          <header style={itemHeader}>
            <span style={badge}>{e.kind.replace(/_/g, " ")}</span>
            <time style={muted}>{when(e.at)}</time>
          </header>
          {e.title && <div style={{ fontWeight: 600, color: "var(--ui-text)" }}>{e.title}</div>}
          {e.body && <div style={{ ...muted, whiteSpace: "pre-wrap", marginTop: 4 }}>{e.body}</div>}
          {e.actor && <div style={{ ...muted, marginTop: 4 }}>{e.actor}</div>}
        </article>
      ))}
    </Panel>
  );
}

// ---------------------------------------------------------------- documents (item 90)

type BiDoc = { id: string; name: string; size: number | null; at: string; downloadPath: string | null };

function docRows(raw: unknown): BiDoc[] {
  return listOf(raw, "documents", "items").map((d, i) => {
    const path = text(d.download_path) ?? text(d.downloadPath);
    return {
      id: String(d.id ?? `d-${i}`),
      name: text(d.filename) ?? text(d.file_name) ?? text(d.name) ?? "Document",
      size: typeof d.size_bytes === "number" ? d.size_bytes : typeof d.sizeBytes === "number" ? d.sizeBytes : null,
      at: String(d.created_at ?? d.createdAt ?? ""),
      // Only BI-Server paths are fetched; anything else is shown but not followed.
      downloadPath: path && path.startsWith("/api/v1/bi/") ? path : null,
    };
  });
}

export function BIContactDocuments({ contactId, refreshKey }: { contactId: string; refreshKey?: number }) {
  const { items, loading, error } = useBiList(`${base(contactId)}/documents`, docRows, refreshKey);
  const [openErr, setOpenErr] = useState<string | null>(null);
  return (
    <Panel title={`Documents${items.length ? ` (${items.length})` : ""}`} testId="bi-contact-documents">
      <Status loading={loading} error={error} empty={items.length === 0} emptyText="No documents filed against this contact." />
      {items.map((d) => (
        <div key={d.id} data-testid="bi-contact-document" style={{ ...item, display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
          <span style={{ color: "var(--ui-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
          <span style={{ ...muted, whiteSpace: "nowrap" }}>
            {d.size ? `${Math.max(1, Math.round(d.size / 1024))} KB` : ""}
            {d.at && when(d.at) ? ` - ${new Date(d.at).toLocaleDateString()}` : ""}
            {d.downloadPath && (
              <button
                type="button"
                style={{ ...smallBtn, marginLeft: 8 }}
                onClick={() => { setOpenErr(null); void openAuthedFile(d.downloadPath as string).catch((e: unknown) => setOpenErr(e instanceof Error ? e.message : "Could not open.")); }}
              >
                Open
              </button>
            )}
          </span>
        </div>
      ))}
      {openErr && <div role="alert" style={{ ...muted, color: "var(--ui-text-danger)" }}>{openErr}</div>}
    </Panel>
  );
}

// ---------------------------------------------------------------- duplicates and merge (item 90)

type Duplicate = { id: string; name: string; email: string | null; phone: string | null; company: string | null; reason: string | null };

function duplicateRows(raw: unknown): Duplicate[] {
  return listOf(raw, "duplicates", "items", "candidates").map((d, i) => ({
    id: String(d.id ?? `dup-${i}`),
    name: text(d.full_name) ?? text(d.name) ?? "(no name)",
    email: text(d.email),
    phone: text(d.phone_e164) ?? text(d.phone),
    company: text(d.company_name),
    reason: text(d.match_reason) ?? text(d.reason),
  }));
}

export function BIContactDuplicates({ contactId, onMerged }: { contactId: string; onMerged?: () => void }) {
  const { items, loading, error, reload } = useBiList(`${base(contactId)}/duplicates`, duplicateRows);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function merge(d: Duplicate) {
    if (!window.confirm(`Merge ${d.name} into this contact?\n\nTheir activity, documents and applications move here and the other record is removed. This cannot be undone.`)) return;
    setBusy(d.id);
    setMsg(null);
    try {
      await api(`${base(contactId)}/merge`, { method: "POST", body: { duplicate_id: d.id } });
      setMsg({ ok: true, text: `Merged ${d.name} into this contact.` });
      reload();
      onMerged?.();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Merge failed." });
    } finally {
      setBusy(null);
    }
  }

  if (!loading && !error && items.length === 0 && !msg) return null;
  return (
    <Panel title={`Possible duplicates${items.length ? ` (${items.length})` : ""}`} testId="bi-contact-duplicates">
      <Status loading={loading} error={error} empty={false} emptyText="" />
      {items.map((d) => (
        <div key={d.id} data-testid="bi-contact-duplicate" style={item}>
          <div style={{ fontWeight: 600, color: "var(--ui-text)" }}>{d.name}</div>
          {d.company && <div style={muted}>{d.company}</div>}
          {d.email && <div style={{ color: "var(--ui-text)", fontSize: 12 }}>{d.email}</div>}
          {d.phone && <div style={{ color: "var(--ui-text)", fontSize: 12 }}>{d.phone}</div>}
          {d.reason && <div style={muted}>{d.reason.replace(/_/g, " ")}</div>}
          <button type="button" disabled={busy !== null} onClick={() => void merge(d)} style={{ ...smallBtn, marginTop: 6 }}>
            {busy === d.id ? "Merging..." : "Merge into this contact"}
          </button>
        </div>
      ))}
      {msg && (
        <div role="status" style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: msg.ok ? "var(--ui-text-success)" : "var(--ui-text-danger)" }}>
          {msg.text}
        </div>
      )}
    </Panel>
  );
}

const panel: CSSProperties = { marginTop: 16, border: "1px solid var(--ui-border-soft)", borderRadius: 6, padding: 16, background: "var(--ui-surface-strong)" };
const item: CSSProperties = { borderTop: "1px solid var(--ui-border-soft)", padding: "8px 0" };
const itemHeader: CSSProperties = { display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 4 };
const muted: CSSProperties = { color: "var(--ui-text-muted)", fontSize: 12 };
const badge: CSSProperties = { fontSize: 11, fontWeight: 600, textTransform: "capitalize", color: "var(--ui-text)", background: "var(--ui-surface-muted)", border: "1px solid var(--ui-border)", borderRadius: 12, padding: "2px 8px" };
const smallBtn: CSSProperties = { border: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)", color: "var(--ui-text)", borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer" };
const tab = (active: boolean): CSSProperties => ({
  background: "none", border: "none", padding: "4px 0", cursor: "pointer", fontSize: 13, textTransform: "capitalize",
  color: active ? "var(--ui-text)" : "var(--ui-text-muted)", fontWeight: active ? 600 : 400,
  borderBottom: active ? "2px solid var(--ui-accent-blue)" : "2px solid transparent",
});
