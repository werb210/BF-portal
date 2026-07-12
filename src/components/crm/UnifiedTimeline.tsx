// BF_PORTAL_UNIFIED_TIMELINE_v1 - single chronological activity feed for a
// contact. Merges notes/tasks/meetings (crmApi.timeline) with rich emails
// (expandable body + read status) and calls (audio playback + transcript),
// newest-first. Replaces the old stacked ActivityTimeline + bottom
// ContactEmailFeed/ContactCallFeed sections.
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { crmApi, type Scope, type TimelineItem } from "@/api/crm";
import { api } from "@/api";
import { API_BASE } from "@/config/api"; // BF_PORTAL_RECORDING_PROXY_v1
import { getAuthToken } from "@/lib/authToken";

type EmailRow = {
  id: string;
  subject?: string | null;
  body_html?: string | null;
  from_address?: string | null;
  to_addresses?: string[] | null;
  opened_at?: string | null;
  created_at?: string | null;
  // BF_PORTAL_EMAIL_OPEN_DETAIL_v1
  open_count?: number | null;
  opens?: Array<{ opened_at: string }> | null;
};

type CallRow = {
  conference_id: string;
  direction?: string | null;
  started_at?: string | null;
  created_at?: string | null;
  recording_url?: string | null;
  recording_duration_sec?: number | null;
  transcript_text?: string | null;
  transcript_summary?: string | null;
};

// BF_PORTAL_TIMELINE_KINDS_v1 - voicemail and sms were emitted by the server but had
// no place in this union, so they were dropped on the floor.
type Kind = "note" | "task" | "call" | "email" | "meeting" | "voicemail" | "sms";
type FilterTab = "all" | Kind;

type Entry =
  | { kind: "note" | "task" | "meeting" | "voicemail" | "sms"; id: string; ts: number; item: TimelineItem }
  | { kind: "email"; id: string; ts: number; email: EmailRow }
  | { kind: "call"; id: string; ts: number; call: CallRow };

const tsOf = (s?: string | null): number => {
  if (!s) return 0;
  const n = Date.parse(s);
  return Number.isNaN(n) ? 0 : n;
};

export function UnifiedTimeline({ contactId, scope, refreshKey }: {
  contactId: string; scope: Scope; refreshKey?: number;
}): JSX.Element {
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [emails, setEmails] = useState<EmailRow[]>([]);
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    (async () => {
      const [tl, em, ca] = await Promise.all([
        crmApi.timeline(scope).then((r) => (Array.isArray(r) ? r : [])).catch(() => [] as TimelineItem[]),
        api.get<{ items?: EmailRow[] }>(`/api/crm/contacts/${encodeURIComponent(contactId)}/emails`).then((r) => r?.items ?? []).catch(() => [] as EmailRow[]),
        api.get<{ items?: CallRow[] }>(`/api/crm/contacts/${encodeURIComponent(contactId)}/calls`).then((r) => r?.items ?? []).catch(() => [] as CallRow[]),
      ]);
      if (cancelled) return;
      setTimeline(tl);
      setEmails(em);
      setCalls(ca);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [contactId, scope.kind, scope.id, refreshKey]);

  const entries = useMemo<Entry[]>(() => {
    const out: Entry[] = [];
    for (const t of timeline) {
      // BF_PORTAL_TIMELINE_KINDS_v1 - this used to keep ONLY note/task/meeting and
      // silently drop everything else the server emits. Voicemails and SMS therefore
      // never appeared on a contact record at all. 'call'/'email' stay excluded here
      // because they are fetched from their own endpoints below; including them would
      // double-render every call and email.
      if (t.kind === "note" || t.kind === "task" || t.kind === "meeting"
          || t.kind === "voicemail" || t.kind === "sms") {
        out.push({ kind: t.kind, id: t.id, ts: tsOf(t.ts), item: t });
      }
    }
    for (const e of emails) out.push({ kind: "email", id: e.id, ts: tsOf(e.created_at), email: e });
    for (const c of calls) out.push({ kind: "call", id: c.conference_id, ts: tsOf(c.started_at ?? c.created_at), call: c });
    out.sort((a, b) => b.ts - a.ts);
    return out;
  }, [timeline, emails, calls]);

  const filtered = filter === "all" ? entries : entries.filter((e) => e.kind === filter);

  return (
    <div style={container}>
      <div style={tabsRow}>
        <Tab id="all" label="All activities" current={filter} onClick={setFilter} />
        <Tab id="note" label="Notes" current={filter} onClick={setFilter} />
        <Tab id="email" label="Emails" current={filter} onClick={setFilter} />
        <Tab id="call" label="Calls" current={filter} onClick={setFilter} />
        <Tab id="task" label="Tasks" current={filter} onClick={setFilter} />
        <Tab id="meeting" label="Meetings" current={filter} onClick={setFilter} />
      </div>

      {loading && <div style={empty}>Loading...</div>}
      {err && <div style={{ ...empty, color: "#b00020" }}>{err}</div>}
      {!loading && !err && filtered.length === 0 && <div style={empty}>No activity yet.</div>}

      {filtered.map((entry) => {
        const key = `${entry.kind}-${entry.id}`;
        const isOpen = openId === key;
        return (
          <article key={key} style={card}>
            <header style={cardHeader}>
              <span style={kindBadge(entry.kind)}>{entry.kind}</span>
              <time style={tsStyle}>{entry.ts ? new Date(entry.ts).toLocaleString() : ""}</time>
            </header>

            {(entry.kind === "note" || entry.kind === "task" || entry.kind === "meeting"
              || entry.kind === "voicemail" || entry.kind === "sms") && (
              <>
                {entry.item.title && <div style={{ fontWeight: 500, color: "var(--ui-text)" }}>{entry.item.title}</div>}
                {entry.item.body && <div style={{ color: "var(--ui-text-muted)", marginTop: 4, whiteSpace: "pre-wrap" }}>{entry.item.body}</div>}
                {entry.item.extra && <div style={extra}>{entry.item.extra}</div>}
              </>
            )}

            {entry.kind === "email" && (
              <EmailCard email={entry.email} isOpen={isOpen} onToggle={() => setOpenId(isOpen ? null : key)} />
            )}

            {entry.kind === "call" && (
              <CallCard call={entry.call} isOpen={isOpen} onToggle={() => setOpenId(isOpen ? null : key)} />
            )}
          </article>
        );
      })}
    </div>
  );
}

function EmailCard({ email, isOpen, onToggle }: { email: EmailRow; isOpen: boolean; onToggle: () => void }) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        style={{ width: "100%", textAlign: "left", background: "transparent", border: "none", cursor: "pointer", padding: 0, display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}
      >
        <span style={{ fontWeight: 600, color: "var(--ui-text)", fontSize: 14 }}>{email.subject || "(no subject)"}</span>
        <span style={{ fontSize: 12, color: ((email.open_count ?? 0) > 0 || email.opened_at) ? "#059669" : "#9ca3af", whiteSpace: "nowrap" }}>
          {(email.open_count ?? 0) > 0
            ? `Opened${(email.open_count ?? 0) > 1 ? ` ${email.open_count}x` : ""}`
            : email.opened_at ? "Opened" : "Sent"}
        </span>
      </button>
      {isOpen && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 12, color: "var(--ui-text-muted)", marginBottom: 6 }}>
            From {email.from_address || "-"} * To {(email.to_addresses ?? []).join(", ") || "-"}
            {(() => {
              // BF_PORTAL_EMAIL_OPEN_DETAIL_v1: count + each open's date/time.
              const list = (email.opens && email.opens.length > 0)
                ? email.opens
                : (email.opened_at ? [{ opened_at: email.opened_at }] : []);
              if (list.length === 0) return null;
              const n = email.open_count ?? list.length;
              return (
                <div style={{ marginTop: 4 }}>
                  Opened {n} time{n === 1 ? "" : "s"}:
                  {list.map((o, i) => (
                    <span key={i} style={{ display: "block", marginLeft: 8 }}>
                      {new Date(o.opened_at).toLocaleString()}
                    </span>
                  ))}
                </div>
              );
            })()}
          </div>
          <iframe
            title={`email-${email.id}`}
            sandbox=""
            srcDoc={email.body_html ?? "<p>(no content)</p>"}
            style={{ width: "100%", minHeight: 200, border: "1px solid var(--ui-border)", borderRadius: 6, background: "var(--ui-surface-strong)" }}
          />
        </div>
      )}
    </div>
  );
}

function CallCard({ call, isOpen, onToggle }: { call: CallRow; isOpen: boolean; onToggle: () => void }) {
  const fmtDur = (s?: number | null) => {
    if (!s || s <= 0) return "";
    const m = Math.floor(s / 60); const sec = s % 60;
    return ` * ${m}:${String(sec).padStart(2, "0")}`;
  };
  const hasTranscript = Boolean(call.transcript_summary || call.transcript_text);
  return (
    <div>
      <div style={{ fontSize: 14, color: "var(--ui-text)", textTransform: "capitalize" }}>
        {call.direction || "call"}{fmtDur(call.recording_duration_sec)}
      </div>
      {call.recording_url ? (
        <audio controls preload="none" src={`${API_BASE}/api/communications/recordings/by-conference/${call.conference_id}/media?token=${encodeURIComponent(getAuthToken() ?? "")}`} style={{ width: "100%", marginTop: 8, height: 36 }} />
      ) : (
        <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 6 }}>No recording.</div>
      )}
      {hasTranscript && (
        <button type="button" onClick={onToggle} style={{ marginTop: 6, background: "transparent", border: "none", color: "var(--ui-accent-blue)", fontSize: 13, cursor: "pointer", padding: 0 }}>
          {isOpen ? "Hide transcript" : "Show transcript"}
        </button>
      )}
      {isOpen && hasTranscript && (
        <div style={{ marginTop: 6 }}>
          {call.transcript_summary && <div style={{ fontSize: 13, color: "var(--ui-text-muted)", fontStyle: "italic", marginBottom: 6 }}>{call.transcript_summary}</div>}
          {call.transcript_text && <div style={{ fontSize: 13, color: "var(--ui-text)", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{call.transcript_text}</div>}
        </div>
      )}
    </div>
  );
}

function Tab({ id, label, current, onClick }: { id: FilterTab; label: string; current: FilterTab; onClick: (v: FilterTab) => void }) {
  const active = current === id;
  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      style={{
        background: "none", border: "none", padding: "8px 0", cursor: "pointer",
        color: active ? "#0091ae" : "var(--ui-text-muted)", fontWeight: active ? 600 : 400,
        borderBottom: active ? "2px solid #0091ae" : "2px solid transparent",
      }}
    >
      {label}
    </button>
  );
}

const container: CSSProperties = { background: "var(--ui-surface-muted)", borderRadius: 6, padding: 16 };
const tabsRow: CSSProperties = { display: "flex", gap: 16, borderBottom: "1px solid var(--ui-border)", marginBottom: 16, flexWrap: "wrap" };
const card: CSSProperties = { background: "var(--ui-surface-strong)", borderRadius: 4, padding: 12, marginBottom: 8, border: "1px solid var(--ui-border-soft)" };
const cardHeader: CSSProperties = { display: "flex", justifyContent: "space-between", marginBottom: 4 };
const tsStyle: CSSProperties = { fontSize: 12, color: "var(--ui-text-muted)" };
const extra: CSSProperties = { fontSize: 12, color: "var(--ui-text-muted)", marginTop: 4 };
const empty: CSSProperties = { padding: 16, textAlign: "center", color: "var(--ui-text-muted)" };

function kindBadge(kind: Kind): CSSProperties {
  const palette: Record<Kind, { bg: string; fg: string }> = {
    note: { bg: "#fff8e1", fg: "#5b4900" },
    task: { bg: "#e8eaf6", fg: "#1a237e" },
    call: { bg: "#e3f2fd", fg: "#0d47a1" },
    email: { bg: "#e8f5e9", fg: "#1b5e20" },
    meeting: { bg: "#fce4ec", fg: "#880e4f" },
    voicemail: { bg: "#ede7f6", fg: "#311b92" }, // BF_PORTAL_TIMELINE_KINDS_v1
    sms: { bg: "#e0f7fa", fg: "#006064" },
  };
  const c = palette[kind];
  return {
    display: "inline-block", padding: "2px 8px", borderRadius: 12,
    fontSize: 11, fontWeight: 600, textTransform: "capitalize",
    background: c.bg, color: c.fg,
  };
}
