// BF_PORTAL_v873_LENDER_API - on the application's Lenders tab: lenders connected by API. "Submit by API", the status the
// lender reports (synced by webhook or polling), its offers, conditions and document requests, the status timeline,
// "Sync now" and "Send a document". Shown only when a lender is connected.
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  apiMessage, fetchAppLenders, fetchSendableFiles, sendDocument, submitByApi, syncNow, type AppLender, type Bucket,
} from "@/api/lenderConnections";

const BUCKET_COLORS: Record<Bucket, { bg: string; fg: string }> = {
  submitted: { bg: "#e0f2fe", fg: "#075985" },
  in_review: { bg: "#e0e7ff", fg: "#3730a3" },
  documents_requested: { bg: "#fef3c7", fg: "#78350f" },
  offer: { bg: "#dcfce7", fg: "#14532d" },
  closing: { bg: "#d1fae5", fg: "#064e3b" },
  funded: { bg: "#bbf7d0", fg: "#14532d" },
  declined: { bg: "#fee2e2", fg: "#7f1d1d" },
  withdrawn: { bg: "#f1f5f9", fg: "#334155" },
  unknown: { bg: "#f1f5f9", fg: "#334155" },
};

const SUBMISSION_STATE: Record<string, string> = {
  sending: "Sending…",
  submitted: "Sent by API",
  retrying: "Failed, retrying",
  failed: "Failed",
  sent_by_email: "API failed, sent by email",
};

const s = {
  wrap: { border: "1px solid var(--ui-border)", borderRadius: 10, background: "var(--ui-surface-strong)", padding: 14, marginBottom: 16 } as const,
  title: { fontSize: 15, fontWeight: 700, color: "var(--ui-text)", margin: "0 0 4px" } as const,
  muted: { fontSize: 12, color: "var(--ui-text-muted)" } as const,
  card: { borderTop: "1px solid var(--ui-border)", padding: "12px 0" } as const,
  btn: { border: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)", color: "var(--ui-text)", padding: "6px 12px", borderRadius: 6, fontSize: 13, cursor: "pointer", fontFamily: "inherit" } as const,
  primary: { border: 0, background: "var(--ui-accent-blue)", color: "#fff", padding: "6px 12px", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" } as const,
  pill: { display: "inline-block", padding: "2px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600 } as const,
  list: { margin: "6px 0 0 16px", padding: 0, fontSize: 13, color: "var(--ui-text)" } as const,
};

const money = (v: unknown) => {
  const n = Number(v);
  return v === null || v === undefined || v === "" || !Number.isFinite(n) ? "—" : `$${n.toLocaleString("en-CA", { maximumFractionDigits: 0 })}`;
};

function LenderCard({ appId, l, buckets, onChanged }: { appId: string; l: AppLender; buckets: Record<string, string>; onChanged: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);
  const [docPicker, setDocPicker] = useState(false);
  const files = useQuery({ queryKey: ["lender-api-files", appId, l.lender_id], queryFn: () => fetchSendableFiles(appId, l.lender_id), enabled: docPicker });
  const sub = l.submission;
  const bucket = (sub?.bucket ?? null) as Bucket | null;
  const colors = bucket ? BUCKET_COLORS[bucket] : null;
  const canResubmit = l.can_submit && (!sub || ["failed", "sent_by_email"].includes(sub.status) || !sub.external_id);

  const run = async (key: string, fn: () => Promise<unknown>, okText: string, failText: string) => {
    setBusy(key); setNote(null);
    try { await fn(); setNote({ tone: "ok", text: okText }); onChanged(); }
    catch (err) { setNote({ tone: "err", text: apiMessage(err, failText) }); }
    finally { setBusy(null); }
  };

  return (
    <div style={s.card} data-testid={`lender-api-${l.lender_id}`}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 700, color: "var(--ui-text)", fontSize: 14 }}>{l.lender_name}</div>
          <div style={s.muted}>
            {l.connector_label}
            {l.availability === "awaiting_lender_api_docs" ? " · waiting for the lender's API documentation; packages go by email" : ""}
            {!l.enabled && l.availability === "available" ? " · connection off" : ""}
          </div>
          {sub && (
            <div style={{ marginTop: 6, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: "var(--ui-text)" }}>{SUBMISSION_STATE[sub.status] ?? sub.status}{sub.external_id ? ` · their id ${sub.external_id}` : ""}</span>
              {sub.lender_status && colors && (
                <span data-testid="lender-api-status" style={{ ...s.pill, background: colors.bg, color: colors.fg }}>
                  {sub.lender_status_label || sub.lender_status} · {buckets[bucket!] ?? bucket}
                </span>
              )}
            </div>
          )}
          {sub?.last_synced_at && <div style={s.muted}>Last update {new Date(sub.last_synced_at).toLocaleString()}</div>}
          {sub?.status === "retrying" && sub.next_retry_at && <div style={s.muted}>Next try {new Date(sub.next_retry_at).toLocaleTimeString()}</div>}
          {sub?.last_error && sub.status !== "submitted" && <div style={{ fontSize: 12, color: "#991b1b", marginTop: 2 }}>{sub.last_error}</div>}
          {(sub?.warnings ?? []).length > 0 && <div style={{ fontSize: 12, color: "#78350f", marginTop: 2 }}>{(sub!.warnings ?? []).join(" ")}</div>}
          {sub?.funded_amount != null && <div style={{ fontSize: 13, color: "var(--ui-text)", marginTop: 2 }}>Funded: {money(sub.funded_amount)}</div>}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {canResubmit && (
            <button type="button" data-testid={`lender-api-submit-${l.lender_id}`} style={s.primary} disabled={busy !== null}
              onClick={() => { if (window.confirm(`Send the package to ${l.lender_name} through their API?`)) void run("submit", () => submitByApi(appId, l.lender_id), `Sent to ${l.lender_name} by API.`, "Could not send by API."); }}>
              {busy === "submit" ? "Sending…" : "Submit by API"}
            </button>
          )}
          {sub?.external_id && l.capabilities?.status && l.availability === "available" && (
            <button type="button" style={s.btn} disabled={busy !== null} onClick={() => void run("sync", () => syncNow(appId, l.lender_id), "Updated from the lender.", "Could not reach the lender.")}>
              {busy === "sync" ? "Checking…" : "Sync now"}
            </button>
          )}
          {sub?.external_id && l.capabilities?.upload && l.availability === "available" && (
            <button type="button" style={s.btn} onClick={() => setDocPicker((v) => !v)}>Send a document</button>
          )}
          {l.events.length > 0 && <button type="button" style={s.btn} onClick={() => setShowTimeline((v) => !v)}>{showTimeline ? "Hide timeline" : `Timeline (${l.events.length})`}</button>}
        </div>
      </div>
      {note && <div role="status" style={{ fontSize: 13, marginTop: 6, color: note.tone === "ok" ? "#14532d" : "#991b1b" }}>{note.text}</div>}

      {docPicker && (
        <div style={{ marginTop: 8 }}>
          {files.isLoading ? <span style={s.muted}>Loading files…</span> : (
            <ul style={s.list}>
              {(files.data?.files ?? []).map((f) => (
                <li key={`${f.category}/${f.filename}`}>
                  {f.category}: {f.filename}{" "}
                  <button type="button" style={{ ...s.btn, padding: "2px 8px", fontSize: 12 }} disabled={busy !== null}
                    onClick={() => void run(`doc:${f.filename}`, () => sendDocument(appId, l.lender_id, { category: f.category, filename: f.filename }), `${f.filename} sent.`, `Could not send ${f.filename}.`)}>
                    Send
                  </button>
                </li>
              ))}
              {(files.data?.files ?? []).length === 0 && <li style={s.muted}>No package files.</li>}
            </ul>
          )}
        </div>
      )}

      {l.offers.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ui-text)" }}>Offers from {l.lender_name}</div>
          <ul style={s.list}>
            {l.offers.map((o) => (
              <li key={o.id}>{money(o.amount)}{o.term ? ` · ${o.term}` : ""}{o.rate_factor ? ` · ${o.rate_factor}` : ""}{o.payment_frequency ? ` · ${o.payment_frequency}` : ""}{o.expiry_date ? ` · expires ${String(o.expiry_date).slice(0, 10)}` : ""} ({o.status})</li>
            ))}
          </ul>
        </div>
      )}

      {l.conditions.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ui-text)" }}>Conditions and document requests</div>
          <div style={s.muted}>Each one is also on the file's funding conditions checklist, and is ticked off there when the lender reports it done.</div>
          <ul style={s.list}>
            {l.conditions.map((c) => (
              <li key={c.id} style={{ textDecoration: c.status === "open" ? "none" : "line-through", color: c.status === "open" ? "var(--ui-text)" : "var(--ui-text-muted)" }}>
                {c.kind === "document_request" ? "Document: " : ""}{c.description}{c.document_type ? ` (${c.document_type})` : ""} · {c.status}
              </li>
            ))}
          </ul>
        </div>
      )}

      {showTimeline && (
        <ol data-testid="lender-api-timeline" style={{ ...s.list, listStyle: "none", marginLeft: 0 }}>
          {l.events.map((e) => (
            <li key={e.id} style={{ padding: "4px 0", borderBottom: "1px solid var(--ui-border)" }}>
              <span style={s.muted}>{new Date(e.created_at).toLocaleString()} · {e.source}</span>
              <div>{e.detail ?? e.kind}</div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default function LenderApiPanel({ applicationId }: { applicationId: string }) {
  const enabled = Boolean(applicationId);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["lender-api", applicationId],
    queryFn: () => fetchAppLenders(applicationId),
    enabled,
    refetchInterval: 60_000,
  });
  const lenders = q.data?.lenders ?? [];
  if (!enabled || !Array.isArray(lenders) || lenders.length === 0) return null;
  return (
    <section style={s.wrap} data-testid="lender-api-panel">
      <h3 style={s.title}>Lender API</h3>
      <p style={{ ...s.muted, margin: "0 0 4px" }}>Lenders connected by API. Status, offers and conditions update here as the lender reports them.</p>
      {lenders.map((l) => (
        <LenderCard key={l.lender_id} appId={applicationId} l={l} buckets={q.data?.buckets ?? {}}
          onChanged={() => { void qc.invalidateQueries({ queryKey: ["lender-api", applicationId] }); void qc.invalidateQueries({ queryKey: ["sent-lenders", applicationId] }); }} />
      ))}
    </section>
  );
}
