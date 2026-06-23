import { useEffect, useState } from "react";
import { api } from "@/api";

type EmailRow = {
  id: string;
  subject?: string | null;
  body_html?: string | null;
  from_address?: string | null;
  to_addresses?: string[] | null;
  opened_at?: string | null;
  created_at?: string | null;
};

export function ContactEmailFeed({ contactId }: { contactId: string }) {
  const [items, setItems] = useState<EmailRow[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await api.get<{ items?: EmailRow[] }>(`/api/crm/contacts/${encodeURIComponent(contactId)}/emails`);
        if (!cancelled) setItems(r?.items ?? []);
      } catch { if (!cancelled) setItems([]); }
      finally { if (!cancelled) setLoaded(true); }
    })();
    return () => { cancelled = true; };
  }, [contactId]);

  if (!loaded || items.length === 0) return null;

  return (
    <div style={{ marginTop: 16, border: "1px solid #eaf0f6", borderRadius: 6, padding: 16 }}>
      <h3 style={{ marginTop: 0, fontSize: 15 }}>Emails</h3>
      {items.map((e) => {
        const isOpen = openId === e.id;
        return (
          <div key={e.id} style={{ borderTop: "1px solid #f3f4f6", padding: "8px 0" }}>
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : e.id)}
              style={{ width: "100%", textAlign: "left", background: "transparent", border: "none", cursor: "pointer", padding: 0, display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}
            >
              <span style={{ fontWeight: 600, color: "#111827", fontSize: 14 }}>{e.subject || "(no subject)"}</span>
              <span style={{ fontSize: 12, color: e.opened_at ? "#059669" : "#9ca3af", whiteSpace: "nowrap" }}>
                {e.opened_at ? "Opened" : "Sent"}{e.created_at ? ` · ${new Date(e.created_at).toLocaleDateString()}` : ""}
              </span>
            </button>
            {isOpen && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
                  From {e.from_address || "—"} · To {(e.to_addresses ?? []).join(", ") || "—"}
                  {e.opened_at ? ` · opened ${new Date(e.opened_at).toLocaleString()}` : ""}
                </div>
                <iframe
                  title={`email-${e.id}`}
                  sandbox=""
                  srcDoc={e.body_html ?? "<p>(no content)</p>"}
                  style={{ width: "100%", minHeight: 200, border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff" }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

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

export function ContactCallFeed({ contactId }: { contactId: string }) {
  const [items, setItems] = useState<CallRow[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await api.get<{ items?: CallRow[] }>(`/api/crm/contacts/${encodeURIComponent(contactId)}/calls`);
        if (!cancelled) setItems(r?.items ?? []);
      } catch { if (!cancelled) setItems([]); }
      finally { if (!cancelled) setLoaded(true); }
    })();
    return () => { cancelled = true; };
  }, [contactId]);

  if (!loaded || items.length === 0) return null;

  const fmtDur = (s?: number | null) => {
    if (!s || s <= 0) return "";
    const m = Math.floor(s / 60); const sec = s % 60;
    return ` · ${m}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <div style={{ marginTop: 16, border: "1px solid #eaf0f6", borderRadius: 6, padding: 16 }}>
      <h3 style={{ marginTop: 0, fontSize: 15 }}>Calls</h3>
      {items.map((c) => {
        const isOpen = openId === c.conference_id;
        const when = c.started_at ?? c.created_at;
        return (
          <div key={c.conference_id} style={{ borderTop: "1px solid #f3f4f6", padding: "8px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
              <span style={{ fontSize: 14, color: "#111827", textTransform: "capitalize" }}>
                {c.direction || "call"}{fmtDur(c.recording_duration_sec)}
              </span>
              <span style={{ fontSize: 12, color: "#9ca3af", whiteSpace: "nowrap" }}>{when ? new Date(when).toLocaleString() : ""}</span>
            </div>
            {c.recording_url ? (
              <audio controls preload="none" src={c.recording_url} style={{ width: "100%", marginTop: 8, height: 36 }} />
            ) : (
              <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 6 }}>No recording.</div>
            )}
            {(c.transcript_summary || c.transcript_text) && (
              <button type="button" onClick={() => setOpenId(isOpen ? null : c.conference_id)} style={{ marginTop: 6, background: "transparent", border: "none", color: "var(--ui-accent-blue)", fontSize: 13, cursor: "pointer", padding: 0 }}>
                {isOpen ? "Hide transcript" : "Show transcript"}
              </button>
            )}
            {isOpen && (
              <div style={{ marginTop: 6 }}>
                {c.transcript_summary && <div style={{ fontSize: 13, color: "#374151", fontStyle: "italic", marginBottom: 6 }}>{c.transcript_summary}</div>}
                {c.transcript_text && <div style={{ fontSize: 13, color: "#111827", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{c.transcript_text}</div>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
