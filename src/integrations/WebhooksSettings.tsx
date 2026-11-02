// BF_PORTAL_v875_WEBHOOKS (ported from KS-Portal webhooks/*, plan gate removed) - Settings > Webhooks (Admins): send
// events to other tools (or a Zapier "Catch Hook") the moment they happen. Per silo (the topbar silo): endpoints, events,
// events per request (batching), the signing secret (shown once), a 30-day delivery log with Resend, the event and
// payload reference, how to check the signature, and a short Zapier guide.
import { useCallback, useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { useSilo } from "@/hooks/useSilo";
import { card, cell, errorBox, h3, headCell, input, label, muted, okBox, primary, quiet } from "@/crmFields/PropertiesSettings";
import {
  createEndpoint, deleteEndpoint, getEventsInfo, listDeliveries, listEndpoints, resendDelivery, rotateSecret, sendTest, STATUS_LABEL,
  updateEndpoint, type Delivery, type Endpoint, type EventsInfo,
} from "./webhooksApi";

const errText = (e: unknown, fallback: string) => (e instanceof Error && e.message && e.message !== "API_ERROR" ? e.message : fallback);
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : "-");
const code: CSSProperties = { display: "block", whiteSpace: "pre", overflowX: "auto", padding: 12, borderRadius: 8, background: "#0f172a", color: "#e2e8f0", fontSize: 12, lineHeight: 1.5, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" };
const secretBox: CSSProperties = { margin: "8px 0", padding: 12, borderRadius: 8, background: "#fef9c3", color: "#713f12", border: "1px solid #facc15", fontSize: 13 };
const STATUS_STYLE: Record<Endpoint["status"], CSSProperties> = {
  active: { background: "#dcfce7", color: "#14532d" },
  paused: { background: "#e5e7eb", color: "#1f2937" },
  disabled: { background: "#fee2e2", color: "#7f1d1d" },
};
const DELIVERY_STYLE: Record<Delivery["status"], CSSProperties> = {
  succeeded: { color: "#14532d" }, dead: { color: "#991b1b" }, pending: { color: "#1e3a8a" }, sending: { color: "#1e3a8a" }, skipped: { color: "#374151" },
};
const badge = (s: CSSProperties): CSSProperties => ({ display: "inline-block", padding: "1px 8px", borderRadius: 999, fontSize: 12, fontWeight: 600, ...s });

function EventPicker({ info, value, onChange }: { info: EventsInfo; value: string[]; onChange: (v: string[]) => void }) {
  const all = info.events.map((e) => e.type);
  return (
    <fieldset style={{ border: "1px solid var(--ui-border)", borderRadius: 8, padding: 10, margin: 0 }}>
      <legend style={{ ...label, padding: "0 4px" }}>Events</legend>
      <label style={{ fontSize: 13, color: "var(--ui-text)", display: "inline-flex", gap: 6, marginBottom: 6 }}>
        <input type="checkbox" checked={value.length === all.length} onChange={(e) => onChange(e.target.checked ? all : [])} /> All events
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 4 }}>
        {info.events.map((e) => (
          <label key={e.type} style={{ fontSize: 13, color: "var(--ui-text)", display: "inline-flex", gap: 6, alignItems: "center" }} title={e.description}>
            <input type="checkbox" checked={value.includes(e.type)} onChange={(ev) => onChange(ev.target.checked ? [...value, e.type] : value.filter((x) => x !== e.type))} />
            {e.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function SecretNotice({ secret, onClose }: { secret: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div role="status" style={secretBox} data-testid="webhook-secret">
      <strong>Signing secret - copy it now, it is not shown again.</strong>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6, flexWrap: "wrap" }}>
        <code style={{ fontSize: 13, background: "#ffffff", color: "#111827", padding: "4px 8px", borderRadius: 6, wordBreak: "break-all" }}>{secret}</code>
        <button type="button" style={quiet} onClick={() => { void navigator.clipboard?.writeText(secret).then(() => setCopied(true), () => undefined); }}>{copied ? "Copied" : "Copy"}</button>
        <button type="button" style={quiet} onClick={onClose}>Done</button>
      </div>
    </div>
  );
}

function DeliveryLog({ endpoint, onClose }: { endpoint: Endpoint; onClose: () => void }) {
  const [rows, setRows] = useState<Delivery[] | null>(null);
  const [status, setStatus] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const load = useCallback(async () => {
    try { setRows(await listDeliveries(endpoint.id, status)); } catch (e) { setMsg(errText(e, "Could not load the log.")); setRows([]); }
  }, [endpoint.id, status]);
  useEffect(() => { void load(); }, [load]);
  const resend = async (d: Delivery) => {
    setMsg(null);
    try { await resendDelivery(d.id); setMsg("Queued to send again. It goes out within a few seconds."); await load(); }
    catch (e) { setMsg(errText(e, "Could not resend.")); }
  };
  return (
    <section style={card} aria-labelledby="log-h">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <h3 id="log-h" style={h3}>Deliveries to {endpoint.url} (last 30 days)</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <select aria-label="Show" style={{ ...input, width: "auto" }} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option><option value="succeeded">Delivered</option><option value="failed">Failed or retrying</option>
            <option value="dead">Failed</option><option value="pending">Waiting</option>
          </select>
          <button type="button" style={quiet} onClick={() => void load()}>Refresh</button>
          <button type="button" style={quiet} onClick={onClose}>Close</button>
        </div>
      </div>
      {msg && <div role="status" style={okBox}>{msg}</div>}
      {rows === null ? <p style={muted}>Loading…</p> : rows.length === 0 ? <p style={muted}>No deliveries yet.</p> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={headCell}>When</th><th style={headCell}>Event</th><th style={headCell}>Result</th><th style={headCell}>Attempts</th><th style={headCell}>Response</th><th style={headCell}></th></tr></thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id}>
                  <td style={cell}>{when(d.created_at)}{d.resend_of ? <div style={{ ...muted, margin: 0 }}>Resent</div> : null}</td>
                  <td style={cell}><code>{d.event_type}</code></td>
                  <td style={cell}><span style={{ fontWeight: 600, ...DELIVERY_STYLE[d.status] }}>{STATUS_LABEL[d.status]}</span>
                    {d.status === "pending" && d.attempts > 0 && d.next_attempt_at ? <div style={{ ...muted, margin: 0 }}>Next try {when(d.next_attempt_at)}</div> : null}</td>
                  <td style={cell}>{d.attempts}</td>
                  <td style={cell}>{d.last_status_code ? `HTTP ${d.last_status_code}` : ""}{d.last_error ? <div style={{ ...muted, margin: 0, maxWidth: 360, wordBreak: "break-word" }}>{d.last_error}</div> : null}</td>
                  <td style={cell}><button type="button" style={quiet} onClick={() => void resend(d)} disabled={endpoint.status !== "active"}>Resend</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Reference({ info }: { info: EventsInfo }) {
  const verify = `// Node.js (Express): verify before trusting the body.
import crypto from "node:crypto";
app.post("/webhooks", express.raw({ type: "application/json" }), (req, res) => {
  const header = req.get("${info.signing.signature_header}") || "";      // t=1767225600,v1=<hex>
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=")));
  const expected = crypto.createHmac("sha256", process.env.WEBHOOK_SECRET)
    .update(parts.t + "." + req.body.toString("utf8")).digest("hex");
  const fresh = Math.abs(Date.now() / 1000 - Number(parts.t)) < ${info.signing.tolerance_seconds};
  const ok = fresh && expected.length === (parts.v1 || "").length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1));
  if (!ok) return res.sendStatus(401);
  const body = JSON.parse(req.body.toString("utf8"));
  const events = Array.isArray(body) ? body : [body];    // each: { id, type, silo, created_at, data: { object, ... } }
  // Each event's id is the same on every retry: use it to ignore duplicates.
  res.sendStatus(204);
});`;
  return (
    <section style={card} aria-labelledby="ref-h">
      <h3 id="ref-h" style={h3}>How deliveries work</h3>
      <ul style={{ ...muted, paddingLeft: 18 }}>
        <li>Each event is a POST with a JSON body: <code>id</code>, <code>type</code>, <code>silo</code>, <code>created_at</code> and <code>data.object</code> (the record, including its custom fields).</li>
        <li>With more than one event per request, the events that are ready together arrive as one JSON array of those bodies (oldest first), with <code>X-Webhook-Event: batch</code> and <code>X-Webhook-Batch-Size</code>. The signature covers the whole array.</li>
        <li>Headers: <code>X-Webhook-Event</code>, <code>X-Webhook-Id</code> (the event id, the same on every retry), <code>X-Webhook-Delivery</code>, <code>X-Webhook-Attempt</code>, <code>{info.signing.timestamp_header}</code> and <code>{info.signing.signature_header}</code>.</li>
        <li>Signature: {info.signing.algorithm}. Reject anything older than {Math.round(info.signing.tolerance_seconds / 60)} minutes so a captured request can't be replayed.</li>
        <li>Answer with any 2xx within {info.retry.timeout_seconds} seconds. Anything else is retried {info.retry.max_attempts - 1} more times, waiting {Math.round(info.retry.first_retry_seconds / 60)} minute, then twice as long each time (at most {info.retry.max_delay_hours} hours).</li>
        <li>After {info.retry.disable_after_dead} events in a row fail every attempt, or if the receiver answers 410 Gone, the endpoint is turned off and every Admin is notified. Turn it back on here and resend what was missed.</li>
        <li>Only public HTTPS addresses are accepted; private and internal networks are refused, and checked again on every delivery. Redirects are not followed.</li>
      </ul>
      <code style={code}>{verify}</code>
      <h3 style={{ ...h3, marginTop: 16 }}>Events and example payloads</h3>
      {info.events.map((e) => (
        <details key={e.type} style={{ borderTop: "1px solid var(--ui-border)", padding: "8px 0" }}>
          <summary style={{ cursor: "pointer", color: "var(--ui-text)", fontSize: 14 }}><code>{e.type}</code> - {e.label}</summary>
          <p style={{ ...muted, margin: "6px 0" }}>{e.description}</p>
          <code style={code}>{JSON.stringify(e.example, null, 2)}</code>
        </details>
      ))}
    </section>
  );
}

function ZapierGuide() {
  return (
    <section style={card} aria-labelledby="zap-h">
      <h3 id="zap-h" style={h3}>Use with Zapier</h3>
      <ol style={{ color: "var(--ui-text)", fontSize: 13, paddingLeft: 18, lineHeight: 1.6, margin: 0 }}>
        <li>In Zapier, create a Zap. For the trigger choose <strong>Webhooks by Zapier</strong>, then <strong>Catch Hook</strong>. Leave "Pick off a child key" empty.</li>
        <li>Copy the webhook URL Zapier shows (it starts with https://hooks.zapier.com/hooks/catch/).</li>
        <li>Keep <strong>Events per request</strong> at 1 for the simplest Zap. A higher number sends a list, and Zapier runs the Zap once for each event in it.</li>
        <li>Here, press <strong>Add endpoint</strong>, paste that URL and tick the events the Zap should run on (one Zap per event type keeps the fields simple).</li>
        <li>Press <strong>Send test</strong> on the endpoint, then <strong>Test trigger</strong> in Zapier. The fields appear as <em>Data Object Email</em>, <em>Data Object Stage</em>, <em>Data Object Custom Fields ...</em> and so on.</li>
        <li>Add the action steps (Google Sheets, Slack, Mailchimp...) and turn the Zap on.</li>
      </ol>
      <p style={{ ...muted, marginTop: 8 }}>
        Zapier doesn't check signatures on Catch Hooks, so keep the hook URL private. When a Zap is turned off Zapier answers 410, and the endpoint here turns itself off.
      </p>
    </section>
  );
}

export default function WebhooksSettings() {
  const [info, setInfo] = useState<EventsInfo | null>(null);
  const [endpoints, setEndpoints] = useState<Endpoint[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [events, setEvents] = useState<string[]>([]);
  const [batchSize, setBatchSize] = useState("1");
  const [busy, setBusy] = useState(false);
  const { silo } = useSilo();
  const siloName = String(silo ?? "BF").toUpperCase();
  const [editing, setEditing] = useState<string | null>(null);
  const [editEvents, setEditEvents] = useState<string[]>([]);
  const [editBatch, setEditBatch] = useState("1");
  const [log, setLog] = useState<Endpoint | null>(null);

  const load = useCallback(async () => {
    try { setEndpoints(await listEndpoints()); } catch (e) { setErr(errText(e, "Could not load webhooks.")); setEndpoints([]); }
  }, []);
  // Reloads when the topbar silo changes: each silo has its own endpoints.
  useEffect(() => {
    setLog(null); setEditing(null);
    getEventsInfo().then(setInfo, (e) => setErr(errText(e, "Could not load the event list.")));
    void load();
  }, [load, siloName]);

  const done = (msg: string) => { setErr(null); setOk(msg); void load(); };
  const fail = (e: unknown, fallback: string) => { setOk(null); setErr(errText(e, fallback)); };

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (!url.trim().toLowerCase().startsWith("https://")) return fail(null, "The URL must start with https://.");
    if (!events.length) return fail(null, "Choose at least one event.");
    const batch = Number(batchSize);
    if (!Number.isInteger(batch) || batch < 1 || batch > info!.limits.batch_size_max) return fail(null, `Events per request must be a whole number from 1 to ${info!.limits.batch_size_max}.`);
    setBusy(true);
    try {
      const r = await createEndpoint({ url: url.trim(), events, description: description.trim(), batch_size: batch });
      setSecret(r.secret);
      setUrl(""); setDescription(""); setEvents([]); setBatchSize("1"); setAdding(false);
      done("Endpoint added. Events start going to it now.");
    } catch (e2) { fail(e2, "Could not add the endpoint."); }
    finally { setBusy(false); }
  };

  const act = async (fn: () => Promise<unknown>, msg: string, fallback: string) => {
    try { await fn(); done(msg); } catch (e) { fail(e, fallback); }
  };

  if (!info || !endpoints) return err ? <div role="alert" style={errorBox}>{err}</div> : <p style={muted}>Loading…</p>;
  const eventLabel = (t: string) => info.events.find((e) => e.type === t)?.label ?? t;

  return (
    <div>
      <section style={card} aria-labelledby="wh-h">
        <h3 id="wh-h" style={h3}>Webhooks for {siloName}</h3>
        <p style={muted}>
          Send contacts, companies, applications, stage changes, documents, offers, signatures, fundings and notes to other tools (or to
          Zapier) the moment they happen. These endpoints only get {siloName} records; switch the silo at the top to set up another silo's.
          Every delivery is signed so the receiver can check it came from Boreal. Up to {info.limits.endpoints} endpoints per silo.
        </p>
        {siloName === "BI" ? <p style={muted}>BI applications and PGI files are kept on the BI server, so in BI these events cover contacts, companies and notes.</p> : null}
        {err && <div role="alert" style={errorBox}>{err}</div>}
        {ok && <div role="status" style={okBox}>{ok}</div>}
        {secret && <SecretNotice secret={secret} onClose={() => setSecret(null)} />}
        {!adding && <button type="button" style={primary} onClick={() => { setAdding(true); setOk(null); }} data-testid="webhook-add">+ Add endpoint</button>}
        {adding && (
          <form onSubmit={add} style={{ ...card, background: "var(--ui-surface)" }} aria-label="New endpoint">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12, marginBottom: 12 }}>
              <div><label style={label} htmlFor="wh-url">Endpoint URL (https)</label>
                <input id="wh-url" autoFocus style={input} value={url} placeholder="https://hooks.zapier.com/hooks/catch/..." onChange={(e) => setUrl(e.target.value)} /></div>
              <div><label style={label} htmlFor="wh-desc">Description</label>
                <input id="wh-desc" style={input} value={description} maxLength={200} placeholder="e.g. Zapier - new deals to Slack" onChange={(e) => setDescription(e.target.value)} /></div>
              <div><label style={label} htmlFor="wh-batch">Events per request</label>
                <input id="wh-batch" type="number" min={1} max={info.limits.batch_size_max} style={input} value={batchSize} onChange={(e) => setBatchSize(e.target.value)} />
                <p style={{ ...muted, margin: "4px 0 0" }}>1 sends each event on its own. More sends the events that are ready together as one list.</p></div>
            </div>
            <EventPicker info={info} value={events} onChange={setEvents} />
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button type="submit" style={primary} disabled={busy}>{busy ? "Adding…" : "Add endpoint"}</button>
              <button type="button" style={quiet} onClick={() => setAdding(false)}>Cancel</button>
            </div>
          </form>
        )}
        {endpoints.length === 0 ? <p style={{ ...muted, marginTop: 12 }}>No endpoints yet.</p> : (
          <div style={{ overflowX: "auto", marginTop: 12 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={headCell}>Endpoint</th><th style={headCell}>Events</th><th style={headCell}>Status</th><th style={headCell}>30 days</th><th style={headCell}>Actions</th></tr></thead>
              <tbody>
                {endpoints.map((ep) => (
                  <tr key={ep.id} data-testid={`webhook-row-${ep.id}`}>
                    <td style={{ ...cell, wordBreak: "break-all", maxWidth: 320 }}>{ep.url}{ep.description ? <div style={{ ...muted, margin: 0 }}>{ep.description}</div> : null}</td>
                    <td style={cell}>
                      {editing === ep.id ? (
                        <>
                          <EventPicker info={info} value={editEvents} onChange={setEditEvents} />
                          <label style={{ ...label, marginTop: 8 }} htmlFor={`wh-batch-${ep.id}`}>Events per request</label>
                          <input id={`wh-batch-${ep.id}`} type="number" min={1} max={info.limits.batch_size_max} style={{ ...input, width: 100 }} value={editBatch} onChange={(e) => setEditBatch(e.target.value)} />
                        </>
                      ) : ep.events.map(eventLabel).join(", ")}
                      {ep.batch_size > 1 ? <div style={{ ...muted, margin: "4px 0 0" }}>Up to {ep.batch_size} events per request</div> : null}
                    </td>
                    <td style={cell}>
                      <span style={badge(STATUS_STYLE[ep.status])}>{ep.status === "active" ? "On" : ep.status === "paused" ? "Paused" : "Turned off"}</span>
                      {ep.disabled_reason && <div style={{ ...muted, margin: "4px 0 0", maxWidth: 260 }}>{ep.disabled_reason}</div>}
                    </td>
                    <td style={cell}>{ep.delivered_30d ?? 0} delivered{ep.failed_30d ? `, ${ep.failed_30d} failed` : ""}{ep.queued ? `, ${ep.queued} waiting` : ""}</td>
                    <td style={{ ...cell, whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {editing === ep.id ? (
                          <>
                            <button type="button" style={primary} onClick={() => void act(async () => { await updateEndpoint(ep.id, { events: editEvents, batch_size: Number(editBatch) }); setEditing(null); }, "Saved.", "Could not save the events.")}>Save</button>
                            <button type="button" style={quiet} onClick={() => setEditing(null)}>Cancel</button>
                          </>
                        ) : (
                          <button type="button" style={quiet} onClick={() => { setEditing(ep.id); setEditEvents(ep.events); setEditBatch(String(ep.batch_size ?? 1)); }}>Edit</button>
                        )}
                        {ep.status === "active"
                          ? <button type="button" style={quiet} onClick={() => void act(() => updateEndpoint(ep.id, { status: "paused" }), "Paused. Nothing is sent until you resume it.", "Could not pause.")}>Pause</button>
                          : <button type="button" style={quiet} onClick={() => void act(() => updateEndpoint(ep.id, { status: "active" }), "Turned on.", "Could not turn it on.")}>{ep.status === "disabled" ? "Turn back on" : "Resume"}</button>}
                        <button type="button" style={quiet} disabled={ep.status !== "active"} onClick={() => void act(() => sendTest(ep.id), "Test event queued. It arrives within a few seconds; check the log.", "Could not send the test.")}>Send test</button>
                        <button type="button" style={quiet} onClick={() => setLog(ep)}>Log</button>
                        <button type="button" style={quiet} onClick={async () => {
                          if (!window.confirm("Make a new signing secret? The current one stops working at once, so update the receiver straight away.")) return;
                          try { setSecret(await rotateSecret(ep.id)); done("New secret made."); } catch (e) { fail(e, "Could not make a new secret."); }
                        }}>New secret</button>
                        <button type="button" style={{ ...quiet, color: "#991b1b", borderColor: "#fecaca" }} onClick={() => {
                          if (window.confirm(`Delete the endpoint ${ep.url}? Its delivery log is deleted too.`)) void act(() => deleteEndpoint(ep.id), "Endpoint deleted.", "Could not delete.");
                        }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {log && <DeliveryLog endpoint={log} onClose={() => setLog(null)} />}
      <ZapierGuide />
      <Reference info={info} />
    </div>
  );
}
