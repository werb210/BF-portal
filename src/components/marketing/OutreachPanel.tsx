// BF_PORTAL_OUTREACH_TRACKING_v1 (2026-11-27) - one screen for following up marketing, used twice and run separately:
// Insurance > Marketing > Outreach (PGI, BI-Server /api/v1/bi/engagement) and Keystone > Marketing > Outreach
// (BF-Server /api/crm/engagement, X-Silo KS). Four views:
//   Follow up  - everyone who replied, booked or clicked and is waiting for us, oldest first, with one-click outcomes
//   Board      - every stage from Sent to Signed up, newest first
//   Results    - the funnel per flow, what kinds of replies came in, and the leaks
//   Settings   - who follows up (one person, or several in turn) and the morning email
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { api } from "@/api";
import { listStaffUsers } from "@/api/sharedShell";
import { useAuth } from "@/hooks/useAuth";

export type OutreachBackend = { base: string; headers?: Record<string, string>; contactLink: (id: string) => string; brand: string };
export const PGI_OUTREACH: OutreachBackend = { base: "/api/v1/bi/engagement", contactLink: (id) => `/silo/bi/crm/contacts/${id}`, brand: "PGI" };
export const KS_OUTREACH: OutreachBackend = { base: "/api/crm/engagement", headers: { "X-Silo": "KS" }, contactLink: (id) => `/silo/ks/crm/contacts/${id}`, brand: "Keystone" };

type Card = {
  contact_id: string; stage: string; stage_at: string | null; flow_name: string | null; reply_kind: string | null; reply_subject: string | null;
  reply_snippet: string | null; owner_user_id: string | null; owner_name: string | null; follow_up_due_at: string | null; follow_up_reason: string | null;
  meeting_at: string | null; meeting_outcome: string | null; full_name: string | null; organization_name: string | null; email: string | null;
  phone_e164: string | null; overdue?: boolean;
};
type Stage = { key: string; label: string; count: number; cards: Card[] };
type Counts = { sent: number; opened: number; clicked: number; replied: number; booked: number; met: number; signed_up: number; lost: number };
type Funnel = { total: Counts; byFlow: Array<Counts & { flow_id: string | null; name: string }>; replyKinds: Array<{ kind: string; n: number }>;
  leaks: { overdue: number; clickers_not_called: number; meetings_no_outcome: number; avg_reply_hours: number | null } };
type Meta = { stages: Array<{ key: string; label: string }>; replyKinds: Record<string, string> };

const box: CSSProperties = { border: "1px solid var(--ui-border)", borderRadius: 10, padding: 12, background: "var(--ui-surface-strong, transparent)" };
const btn: CSSProperties = { padding: "4px 10px", borderRadius: 6, border: "1px solid var(--ui-border)", background: "transparent", color: "var(--ui-text)", cursor: "pointer", fontSize: 12 };
const muted: CSSProperties = { color: "var(--ui-text-muted)", fontSize: 12 };
const REASON: Record<string, string> = { replied: "Replied", booked: "Booked", clicked: "Clicked", no_show: "Missed the meeting" };
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "-");
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "");
const who = (c: Card) => c.full_name || c.email || "Unknown";
const errText = (e: unknown) => (e as { message?: string })?.message || "Something went wrong.";

export default function OutreachPanel({ backend }: { backend: OutreachBackend }) {
  const [view, setView] = useState<"queue" | "board" | "results" | "settings">("queue");
  const [meta, setMeta] = useState<Meta | null>(null);
  const call = useCallback(<T,>(path: string, init: { method?: string; body?: unknown } = {}) =>
    api<T>(`${backend.base}${path}`, { method: init.method ?? "GET", headers: backend.headers, ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}) } as any),
  [backend]);
  useEffect(() => { void call<Meta>("/meta").then(setMeta).catch(() => setMeta(null)); }, [call]);
  const views: Array<[typeof view, string]> = [["queue", "Follow up"], ["board", "Board"], ["results", "Results"], ["settings", "Settings"]];
  return (
    <div data-testid={`outreach-${backend.brand}`} style={{ display: "grid", gap: 12, color: "var(--ui-text)" }}>
      <div role="tablist" aria-label={`${backend.brand} outreach`} style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {views.map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={view === k} onClick={() => setView(k)}
            style={{ ...btn, fontSize: 13, padding: "6px 12px", fontWeight: view === k ? 700 : 500, borderColor: view === k ? "var(--accent, #2563eb)" : "var(--ui-border)" }}>{label}</button>
        ))}
      </div>
      {view === "queue" && <Queue call={call} backend={backend} meta={meta} />}
      {view === "board" && <Board call={call} backend={backend} meta={meta} />}
      {view === "results" && <Results call={call} meta={meta} />}
      {view === "settings" && <Settings call={call} brand={backend.brand} />}
    </div>
  );
}

type Call = <T>(path: string, init?: { method?: string; body?: unknown }) => Promise<T>;

function Actions({ c, call, onDone, meta }: { c: Card; call: Call; onDone: () => void; meta: Meta | null }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const act = async (action: string, extra: Record<string, unknown> = {}) => {
    setBusy(true); setErr(null);
    try { await call(`/contacts/${c.contact_id}/action`, { method: "POST", body: { action, ...extra } }); onDone(); }
    catch (e) { setErr(errText(e)); } finally { setBusy(false); }
  };
  const booked = c.stage === "booked";
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
      <button type="button" style={btn} disabled={busy} onClick={() => void act("followed_up")}>Followed up</button>
      {!booked && <button type="button" style={btn} disabled={busy} onClick={() => void act("booked")}>Booked</button>}
      <button type="button" style={btn} disabled={busy} onClick={() => void act("met")}>{meta?.stages.find((s) => s.key === "met")?.label ?? "Meeting held"}</button>
      {booked && <button type="button" style={btn} disabled={busy} onClick={() => void act("no_show")}>No-show</button>}
      <button type="button" style={btn} disabled={busy} onClick={() => void act("lost", { reason: "not_interested" })}>Not interested</button>
      {meta && c.reply_kind && (
        <select aria-label="Reply type" value={c.reply_kind} disabled={busy} onChange={(e) => void act("reply_kind", { kind: e.target.value })}
          style={{ ...btn, padding: "3px 6px" }}>
          {Object.entries(meta.replyKinds).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      )}
      {err && <span role="alert" style={{ color: "#b91c1c", fontSize: 12 }}>{err}</span>}
    </div>
  );
}

function Queue({ call, backend, meta }: { call: Call; backend: OutreachBackend; meta: Meta | null }) {
  const [items, setItems] = useState<Card[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [mine, setMine] = useState(false);
  const load = useCallback(() => {
    setErr(null);
    call<{ items: Card[] }>("/queue").then((r) => setItems(r.items ?? [])).catch((e) => setErr(errText(e)));
  }, [call]);
  useEffect(load, [load]);
  const { user } = useAuth();
  const me = (user as { id?: string } | null)?.id ?? null;
  if (err) return <p role="alert" style={{ color: "#b91c1c" }}>{err}</p>;
  if (!items) return <p style={muted}>Loading...</p>;
  const shown = mine && me ? items.filter((c) => c.owner_user_id === me) : items;
  const overdue = shown.filter((c) => c.overdue).length;
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <strong>{shown.length} waiting</strong>
        {overdue > 0 && <span style={{ color: "#b91c1c", fontWeight: 600 }}>{overdue} overdue</span>}
        <label style={{ ...muted, display: "flex", gap: 4, alignItems: "center" }}><input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} /> Only mine</label>
        <button type="button" style={btn} onClick={load}>Refresh</button>
      </div>
      {!shown.length && <p style={muted}>Nobody is waiting for a follow-up. Replies, bookings and clicks from the {backend.brand} emails show up here by themselves.</p>}
      {shown.map((c) => (
        <div key={c.contact_id} data-testid="outreach-row" style={{ ...box, borderColor: c.overdue ? "#fca5a5" : "var(--ui-border)", display: "grid", gap: 6 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "baseline" }}>
            <Link to={backend.contactLink(c.contact_id)} style={{ fontWeight: 700 }}>{who(c)}</Link>
            {c.organization_name && <span style={muted}>{c.organization_name}</span>}
            <span style={{ fontSize: 12, fontWeight: 600, padding: "1px 8px", borderRadius: 999, border: "1px solid var(--ui-border)" }}>
              {REASON[c.follow_up_reason ?? ""] ?? c.follow_up_reason}{c.reply_kind && c.follow_up_reason === "replied" ? ` - ${meta?.replyKinds[c.reply_kind] ?? c.reply_kind}` : ""}
            </span>
            <span style={{ ...muted, marginLeft: "auto", color: c.overdue ? "#b91c1c" : undefined }}>{c.overdue ? "Overdue since" : "Due"} {when(c.follow_up_due_at)}</span>
          </div>
          {c.reply_snippet && <blockquote style={{ margin: 0, padding: "4px 10px", borderLeft: "3px solid var(--ui-border)", fontSize: 13, whiteSpace: "pre-wrap" }}>{c.reply_snippet}</blockquote>}
          <div style={muted}>
            {[c.flow_name && `Flow: ${c.flow_name}`, c.meeting_at && `Meeting ${when(c.meeting_at)}`, c.phone_e164, c.email, c.owner_name && `Owner: ${c.owner_name}`].filter(Boolean).join(" · ")}
          </div>
          <Actions c={c} call={call} onDone={load} meta={meta} />
        </div>
      ))}
    </div>
  );
}

function Board({ call, backend, meta }: { call: Call; backend: OutreachBackend; meta: Meta | null }) {
  const [stages, setStages] = useState<Stage[] | null>(null);
  const [q, setQ] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(() => {
    setErr(null);
    call<{ stages: Stage[] }>(`/board${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`).then((r) => setStages(r.stages ?? [])).catch((e) => setErr(errText(e)));
  }, [call, q]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  void meta;
  if (err) return <p role="alert" style={{ color: "#b91c1c" }}>{err}</p>;
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <input aria-label="Search outreach" placeholder="Search a name, email or company" value={q} onChange={(e) => setQ(e.target.value)}
        style={{ padding: "6px 10px", border: "1px solid var(--ui-border)", borderRadius: 6, background: "transparent", color: "var(--ui-text)", maxWidth: 360 }} />
      {!stages ? <p style={muted}>Loading...</p> : (
        <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6 }}>
          {stages.map((s) => (
            <div key={s.key} data-testid={`outreach-stage-${s.key}`} style={{ ...box, minWidth: 220, maxWidth: 260, flex: "0 0 auto", display: "grid", gap: 6, alignContent: "start" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><strong>{s.label}</strong><span style={muted}>{s.count.toLocaleString()}</span></div>
              {s.key === "sent" && <span style={muted}>Emailed, nothing back yet.</span>}
              {s.cards.map((c) => (
                <Link key={c.contact_id} to={backend.contactLink(c.contact_id)} style={{ display: "block", padding: 8, borderRadius: 8, border: "1px solid var(--ui-border)", textDecoration: "none", color: "var(--ui-text)" }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{who(c)}</div>
                  {c.organization_name && <div style={muted}>{c.organization_name}</div>}
                  <div style={muted}>{when(c.stage_at)}{c.follow_up_due_at ? " · follow-up due" : ""}</div>
                </Link>
              ))}
              {s.count > s.cards.length && s.key !== "sent" && <span style={muted}>Newest {s.cards.length} shown</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Results({ call, meta }: { call: Call; meta: Meta | null }) {
  const [days, setDays] = useState(30);
  const [f, setF] = useState<Funnel | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    setErr(null); setF(null);
    call<Funnel>(`/funnel${days ? `?days=${days}` : ""}`).then(setF).catch((e) => setErr(errText(e)));
  }, [call, days]);
  const label = (k: string) => meta?.stages.find((s) => s.key === k)?.label ?? k;
  const cols: Array<keyof Counts> = ["sent", "opened", "clicked", "replied", "booked", "met", "signed_up"];
  if (err) return <p role="alert" style={{ color: "#b91c1c" }}>{err}</p>;
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <label style={{ ...muted, display: "flex", gap: 6, alignItems: "center" }}>First emailed in
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} style={{ ...btn, padding: "3px 6px" }}>
          <option value={7}>the last 7 days</option><option value={30}>the last 30 days</option><option value={90}>the last 90 days</option><option value={0}>all time</option>
        </select>
      </label>
      {!f ? <p style={muted}>Loading...</p> : (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {cols.map((k) => (
              <div key={k} style={{ ...box, minWidth: 110 }}>
                <div style={muted}>{label(k)}</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{Number(f.total[k] ?? 0).toLocaleString()}</div>
                {k !== "sent" && <div style={muted}>{pct(Number(f.total[k] ?? 0), Number(f.total.sent ?? 0))} of sent</div>}
              </div>
            ))}
          </div>
          <div style={box}>
            <strong>Leaks</strong>
            <ul style={{ margin: "6px 0 0 18px", padding: 0, fontSize: 13 }}>
              <li>{f.leaks.overdue} follow-ups overdue</li>
              <li>{f.leaks.clickers_not_called} clicked and were never followed up</li>
              <li>{f.leaks.meetings_no_outcome} meetings with no outcome recorded</li>
              <li>{f.leaks.avg_reply_hours != null ? `Replies answered in ${f.leaks.avg_reply_hours} hours on average` : "No reply times yet"}</li>
            </ul>
            <p style={{ ...muted, margin: "6px 0 0" }}>Opens are a weak signal: Apple Mail opens emails by itself. Clicks, replies and bookings are the real ones.</p>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr>{["Flow", ...cols.map(label)].map((h) => <th key={h} style={{ textAlign: "left", padding: 6, borderBottom: "1px solid var(--ui-border)" }}>{h}</th>)}</tr></thead>
              <tbody>
                {f.byFlow.map((r) => (
                  <tr key={r.flow_id ?? r.name}>
                    <td style={{ padding: 6 }}>{r.name}</td>
                    {cols.map((k) => <td key={k} style={{ padding: 6 }}>{Number(r[k] ?? 0).toLocaleString()}{k !== "sent" && r.sent ? <span style={muted}> ({pct(Number(r[k]), r.sent)})</span> : null}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {f.replyKinds.length > 0 && (
            <div style={box}>
              <strong>Replies by type</strong>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 6, fontSize: 13 }}>
                {f.replyKinds.map((k) => <span key={k.kind}>{meta?.replyKinds[k.kind] ?? k.kind}: <strong>{k.n}</strong></span>)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Settings({ call, brand }: { call: Call; brand: string }) {
  const [staff, setStaff] = useState<Array<{ id: string; name: string }>>([]);
  const [chosen, setChosen] = useState<string[]>([]);
  const [digest, setDigest] = useState(true);
  const [note, setNote] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    void listStaffUsers().then((u) => setStaff(u.map((x) => ({ id: x.id, name: [x.first_name, x.last_name].filter(Boolean).join(" ") || x.email || x.id })))).catch(() => setStaff([]));
    void call<{ settings: { followers: Array<{ id: string }>; digest: boolean } }>("/settings").then((r) => { setChosen(r.settings.followers.map((f) => f.id)); setDigest(r.settings.digest); }).catch((e) => setErr(errText(e)));
  }, [call]);
  const save = async () => {
    setErr(null); setNote(null);
    try {
      await call("/settings", { method: "PUT", body: { followers: chosen.map((id) => ({ id, name: staff.find((s) => s.id === id)?.name ?? "" })), digest } });
      setNote("Saved.");
    } catch (e) { setErr(errText(e)); }
  };
  return (
    <div style={{ ...box, display: "grid", gap: 10, maxWidth: 560 }}>
      <strong>Who follows up on {brand} outreach</strong>
      <p style={{ ...muted, margin: 0 }}>Pick one person, or several to share the work in turn (whoever has the fewest open follow-ups gets the next one). Nobody picked means each flow's owner.</p>
      <div style={{ display: "grid", gap: 4 }}>
        {staff.map((s) => (
          <label key={s.id} style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13 }}>
            <input type="checkbox" checked={chosen.includes(s.id)} onChange={(e) => setChosen(e.target.checked ? [...chosen, s.id] : chosen.filter((x) => x !== s.id))} /> {s.name}
          </label>
        ))}
      </div>
      <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13 }}>
        <input type="checkbox" checked={digest} onChange={(e) => setDigest(e.target.checked)} /> Email each follow-up person a list every weekday at 7am
      </label>
      <div><button type="button" style={{ ...btn, fontSize: 13, padding: "6px 14px" }} onClick={() => void save()}>Save</button></div>
      {note && <span style={{ color: "#15803d", fontSize: 13 }}>{note}</span>}
      {err && <span role="alert" style={{ color: "#b91c1c", fontSize: 13 }}>{err}</span>}
    </div>
  );
}
