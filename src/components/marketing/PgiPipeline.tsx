// BF_PORTAL_PGI_PIPELINE_v1 (2026-11-27) - Todd: PGI outreach is a sales pipeline tied to the CRM contact. Each column is a
// stage (Emailed, Opened, Clicked, Replied, Staff responded, Follow-up, Initial call, Demo, Signed up, Not interested);
// each card shows what the contact has done and opens their CRM contact card (email, SMS, call from there). The email
// stages move by themselves; a booked call or Teams meeting moves them to Initial call; Demo, Signed up and Not
// interested are set by dragging the card or with "Move to". Server: BI-Server /api/v1/bi/engagement.
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";

export type PipeCall = <T>(path: string, init?: { method?: string; body?: unknown }) => Promise<T>;
export type PipeCard = {
  contact_id: string; stage: string; stage_at: string | null; flow_name: string | null; full_name: string | null; organization_name: string | null;
  email: string | null; phone_e164: string | null; sent_keys: string[] | null; replied_key: string | null; reply_snippet: string | null;
  replied_at: string | null; last_reply_at: string | null; responded_at: string | null; meeting_at: string | null; booked_at: string | null;
  demo_at: string | null; signed_up_at: string | null; lost_at: string | null; lost_reason: string | null; opened_at: string | null; clicked_at: string | null;
};
type Column = { key: string; label: string; help?: string; count: number; cards: PipeCard[] };
export type PipeMeta = {
  stages: Array<{ key: string; label: string; help?: string }>; replyKinds: Record<string, string>;
  emailLabels?: Record<string, string>; followUpDays?: number; moves?: Array<{ key: string; label: string }>;
};
type Counts = { sent: number; opened: number; clicked: number; replied: number; responded: number; initial_call: number; demo: number; signed_up: number; lost: number };
type Funnel = { total: Counts; byFlow: Array<Counts & { flow_id: string | null; name: string }>; replyKinds: Array<{ kind: string; n: number }>;
  leaks: { unanswered: number; unanswered_day: number; follow_up: number; avg_reply_hours: number | null } };

const box: CSSProperties = { border: "1px solid var(--ui-border)", borderRadius: 10, padding: 10, background: "var(--ui-surface-strong, transparent)" };
const btn: CSSProperties = { padding: "4px 10px", borderRadius: 6, border: "1px solid var(--ui-border)", background: "transparent", color: "var(--ui-text)", cursor: "pointer", fontSize: 12 };
const muted: CSSProperties = { color: "var(--ui-text-muted)", fontSize: 12 };
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "");
const daysAgo = (iso: string | null) => (iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)) : 0);
const errText = (e: unknown) => (e as { message?: string })?.message || "Something went wrong.";
const FIRST = ["e1", "n2", "n3", "n4"];
const MANUAL: Record<string, string> = { initial_call: "initial_call", demo: "demo", signed_up: "signed_up", lost: "lost" };
const AFTER_OPEN = ["opened", "clicked", "replied", "responded", "follow_up", "initial_call", "demo", "signed_up", "lost"];
const AFTER_CLICK = ["clicked", "replied", "responded", "follow_up", "initial_call", "demo", "signed_up", "lost"];

/** The lines on a card: what this contact has done so far. */
export function cardLines(c: PipeCard, meta: PipeMeta | null): string[] {
  const keys = c.sent_keys ?? [];
  const label = (k: string | null) => (k ? meta?.emailLabels?.[k] ?? k : "");
  const lines: string[] = [];
  const firsts = FIRST.filter((k) => keys.includes(k)).length;
  lines.push(`First emails: ${firsts} of 4${firsts ? ` (last: ${label(FIRST.filter((k) => keys.includes(k)).pop() ?? null)})` : ""}`);
  if (AFTER_OPEN.includes(c.stage) && c.opened_at) lines.push(keys.includes("o1") ? `"Opened" email sent${keys.includes("o2") ? " (both)" : ""}` : `"Opened" email not sent yet`);
  if (AFTER_CLICK.includes(c.stage) && c.clicked_at) lines.push(keys.includes("c1") ? `"Clicked" email sent` : `"Clicked" email not sent yet`);
  if (c.replied_at) lines.push(`Replied${c.replied_key ? ` to "${label(c.replied_key)}"` : ""} · ${when(c.last_reply_at ?? c.replied_at)}`);
  if (c.responded_at && c.replied_at) lines.push(c.stage === "follow_up" ? `We answered ${daysAgo(c.responded_at)} days ago, no reply since` : `We answered · ${when(c.responded_at)}`);
  if (c.stage === "initial_call") lines.push(c.meeting_at ? `Call · ${when(c.meeting_at)}` : `Call booked · ${when(c.booked_at)}`);
  if (c.stage === "demo") lines.push(`Demo · ${when(c.demo_at)}`);
  if (c.stage === "lost" && c.lost_reason) lines.push(c.lost_reason === "unsubscribe" ? "Unsubscribed" : c.lost_reason === "not_interested" || c.lost_reason === "staff" ? "Marked not interested" : `Reason: ${c.lost_reason}`);
  return lines;
}

export function PgiPipeline({ call, meta, contactLink }: { call: PipeCall; meta: PipeMeta | null; contactLink: (id: string) => string }) {
  const navigate = useNavigate();
  const [cols, setCols] = useState<Column[] | null>(null);
  const [q, setQ] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [moved, setMoved] = useState<{ c: PipeCard; to: string } | null>(null);
  const [drag, setDrag] = useState<string | null>(null);
  const load = useCallback(() => {
    setErr(null);
    call<{ stages: Column[] }>(`/board${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`).then((r) => setCols(r.stages ?? [])).catch((e) => setErr(errText(e)));
  }, [call, q]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  const more = async (key: string, offset: number) => {
    try {
      const r = await call<{ stages: Column[] }>(`/board?stage=${key}&offset=${offset}${q.trim() ? `&q=${encodeURIComponent(q.trim())}` : ""}`);
      const extra = r.stages?.[0]?.cards ?? [];
      setCols((all) => (all ?? []).map((s) => (s.key === key ? { ...s, cards: [...s.cards, ...extra] } : s)));
    } catch (e) { setErr(errText(e)); }
  };
  const move = async (c: PipeCard, action: string) => {
    setErr(null);
    try {
      await call(`/contacts/${c.contact_id}/action`, { method: "POST", body: { action, ...(action === "lost" ? { reason: "not_interested" } : {}) } });
      setMoved(action === "auto" ? null : { c, to: action });
      load();
    } catch (e) { setErr(errText(e)); }
  };
  const label = (k: string) => meta?.stages.find((s) => s.key === k)?.label ?? k;

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input aria-label="Search the pipeline" placeholder="Search a name, email or company" value={q} onChange={(e) => setQ(e.target.value)}
          style={{ padding: "6px 10px", border: "1px solid var(--ui-border)", borderRadius: 6, background: "transparent", color: "var(--ui-text)", width: 320, maxWidth: "100%" }} />
        <button type="button" style={btn} onClick={load}>Refresh</button>
        <span style={muted}>Click a card to open the contact. Drag a card to Initial call, Demo, Signed up or Not interested, or use "Move to".</span>
      </div>
      {err && <p role="alert" style={{ color: "#b91c1c", margin: 0 }}>{err}</p>}
      {moved && (
        <div role="status" data-testid="pipeline-undo" style={{ ...box, display: "flex", gap: 10, alignItems: "center", background: "#ecfdf5", borderColor: "#6ee7b7", color: "#065f46" }}>
          <span>{moved.c.full_name || moved.c.email} moved to {label(moved.to)}.</span>
          <button type="button" style={{ ...btn, marginLeft: "auto" }} onClick={() => { const m = moved; setMoved(null); void move(m.c, "auto"); }}>Undo</button>
          <button type="button" style={btn} aria-label="Dismiss" onClick={() => setMoved(null)}>×</button>
        </div>
      )}
      {!cols ? <p style={muted}>Loading...</p> : (
        <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8, alignItems: "flex-start" }}>
          {cols.map((s) => {
            const dropOk = Boolean(MANUAL[s.key]);
            return (
              <section key={s.key} data-testid={`pipeline-stage-${s.key}`} aria-label={s.label}
                onDragOver={(e) => { if (dropOk && drag) e.preventDefault(); }}
                onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData("text/plain"); const c = cols.flatMap((x) => x.cards).find((x) => x.contact_id === id); setDrag(null); if (c && dropOk && c.stage !== s.key) void move(c, MANUAL[s.key]!); }}
                style={{ ...box, width: 250, flex: "0 0 250px", display: "grid", gap: 8, alignContent: "start", outline: drag && dropOk ? "2px dashed #2FA86A" : undefined }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}><strong style={{ fontSize: 14 }}>{s.label}</strong><span style={{ ...muted, fontWeight: 700 }}>{s.count.toLocaleString()}</span></div>
                  {s.help && <div style={muted}>{s.help}</div>}
                </div>
                {s.cards.map((c) => (
                  <article key={c.contact_id} data-testid="pipeline-card" draggable tabIndex={0} role="button"
                    onDragStart={(e) => { e.dataTransfer.setData("text/plain", c.contact_id); setDrag(c.contact_id); }} onDragEnd={() => setDrag(null)}
                    onClick={() => navigate(contactLink(c.contact_id), { state: { from: "outreach" } })}
                    onKeyDown={(e) => { if (e.key === "Enter") navigate(contactLink(c.contact_id), { state: { from: "outreach" } }); }}
                    style={{ padding: 8, borderRadius: 8, border: "1px solid var(--ui-border)", cursor: "pointer", display: "grid", gap: 3, background: "var(--ui-surface, transparent)" }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{c.full_name || c.email || "Unknown"}</div>
                    {c.organization_name && <div style={muted}>{c.organization_name}</div>}
                    {cardLines(c, meta).map((l) => <div key={l} style={{ fontSize: 12 }}>{l}</div>)}
                    {c.stage === "replied" && c.reply_snippet && <div style={{ ...muted, fontStyle: "italic", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>"{c.reply_snippet}"</div>}
                    <div style={muted}>{c.flow_name ?? ""}</div>
                    <select aria-label={`Move ${c.full_name || c.email || "contact"} to`} value="" onClick={(e) => e.stopPropagation()} onChange={(e) => { e.stopPropagation(); if (e.target.value) void move(c, e.target.value); }}
                      style={{ ...btn, padding: "2px 4px", justifySelf: "start" }}>
                      <option value="">Move to...</option>
                      {(meta?.moves ?? []).filter((m) => m.key !== c.stage).map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
                    </select>
                  </article>
                ))}
                {s.count > s.cards.length && <button type="button" style={btn} onClick={() => void more(s.key, s.cards.length)}>Show more ({(s.count - s.cards.length).toLocaleString()})</button>}
                {s.count === 0 && <span style={muted}>Nobody here yet.</span>}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function PgiResults({ call, meta }: { call: PipeCall; meta: PipeMeta | null }) {
  const [days, setDays] = useState(30);
  const [f, setF] = useState<Funnel | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    setErr(null); setF(null);
    call<Funnel>(`/funnel${days ? `?days=${days}` : ""}`).then(setF).catch((e) => setErr(errText(e)));
  }, [call, days]);
  const cols: Array<[keyof Counts, string]> = [["sent", "Emailed"], ["opened", "Opened"], ["clicked", "Clicked"], ["replied", "Replied"], ["responded", "Staff responded"], ["initial_call", "Initial call"], ["demo", "Demo"], ["signed_up", "Signed up"], ["lost", "Not interested"]];
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "-");
  if (err) return <p role="alert" style={{ color: "#b91c1c" }}>{err}</p>;
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <label style={{ ...muted, display: "flex", gap: 6, alignItems: "center" }}>People first emailed in
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} style={{ ...btn, padding: "3px 6px" }}>
          <option value={7}>the last 7 days</option><option value={30}>the last 30 days</option><option value={90}>the last 90 days</option><option value={0}>all time</option>
        </select>
      </label>
      {!f ? <p style={muted}>Loading...</p> : (
        <>
          <p style={{ ...muted, margin: 0 }}>How many people got to each stage (or past it).</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {cols.map(([k, l]) => (
              <div key={k} style={{ ...box, minWidth: 110 }}>
                <div style={muted}>{l}</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{Number(f.total[k] ?? 0).toLocaleString()}</div>
                {k !== "sent" && <div style={muted}>{pct(Number(f.total[k] ?? 0), Number(f.total.sent ?? 0))} of emailed</div>}
              </div>
            ))}
          </div>
          <div style={box}>
            <strong>Needs attention</strong>
            <ul style={{ margin: "6px 0 0 18px", padding: 0, fontSize: 13 }}>
              <li>{f.leaks.unanswered} replies nobody has answered ({f.leaks.unanswered_day} waiting more than a day)</li>
              <li>{f.leaks.follow_up} people we answered {meta?.followUpDays ?? 3}+ days ago who have not written back</li>
              <li>{f.leaks.avg_reply_hours != null ? `We answer replies in ${f.leaks.avg_reply_hours} hours on average` : "No answer times yet"}</li>
            </ul>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr>{["Flow", ...cols.map(([, l]) => l)].map((h) => <th key={h} style={{ textAlign: "left", padding: 6, borderBottom: "1px solid var(--ui-border)" }}>{h}</th>)}</tr></thead>
              <tbody>
                {f.byFlow.map((r) => (
                  <tr key={r.flow_id ?? r.name}>
                    <td style={{ padding: 6 }}>{r.name}</td>
                    {cols.map(([k]) => <td key={k} style={{ padding: 6 }}>{Number(r[k] ?? 0).toLocaleString()}{k !== "sent" && r.sent ? <span style={muted}> ({pct(Number(r[k]), r.sent)})</span> : null}</td>)}
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
