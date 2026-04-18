import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { api } from "@/api";
import { formatPhone } from "@/utils/format";

type Tab = "messages" | "sms" | "inbox" | "issues";

const TABS: { id: Tab; label: string }[] = [
  { id: "messages", label: "Messages" },
  { id: "sms", label: "SMS" },
  { id: "inbox", label: "Inbox" },
  { id: "issues", label: "Issues" },
];

type Contact = { id: string; name: string; phone: string | null };
type Message = { id: string; direction: "inbound" | "outbound"; body: string; created_at: string; staff_name: string | null };
type Issue = { id: string; title: string; description: string; screenshot_url: string | null; created_at: string; status: string };

const tabBase: CSSProperties = {
  padding: "8px 18px", border: "none", background: "transparent",
  fontSize: 14, fontWeight: 500, cursor: "pointer",
  borderBottom: "2px solid transparent", color: "#64748b",
};
const tabActive: CSSProperties = {
  ...tabBase, borderBottomColor: "#2563eb", color: "#2563eb", fontWeight: 600,
};

function SmsTab() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selected, setSelected] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    api<{ contacts: Contact[] }>("/api/crm/contacts")
      .then((r) => setContacts(Array.isArray(r.contacts) ? r.contacts : []))
      .catch(() => {});
  }, []);

  const loadMessages = useCallback((contactId: string) => {
    api<{ messages: Message[] }>(`/api/communications/messages?contactId=${contactId}`)
      .then((r) => setMessages(Array.isArray(r.messages) ? r.messages : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selected) return;
    loadMessages(selected.id);
    pollRef.current = setInterval(() => loadMessages(selected.id), 8000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [selected, loadMessages]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function send() {
    if (!draft.trim() || !selected?.phone || sending) return;
    setSending(true);
    try {
      await api.post("/api/communications/sms", { to: selected.phone, body: draft.trim(), contactId: selected.id });
      setDraft("");
      loadMessages(selected.id);
    } finally { setSending(false); }
  }

  const filtered = contacts.filter(
    (c) => c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search),
  );

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
      <div style={{ width: 260, borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: 10, borderBottom: "1px solid #e2e8f0" }}>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search contacts…"
            style={{ width: "100%", padding: "6px 10px", border: "1px solid #e2e8f0", borderRadius: 7, fontSize: 13, boxSizing: "border-box" }} />
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {filtered.map((c) => (
            <div key={c.id} onClick={() => { setSelected(c); setMessages([]); }}
              style={{ padding: "9px 14px", cursor: "pointer", borderBottom: "1px solid #f1f5f9",
                background: selected?.id === c.id ? "#eff6ff" : "transparent",
                borderLeft: selected?.id === c.id ? "3px solid #2563eb" : "3px solid transparent" }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: "#1e293b" }}>{c.name}</div>
              {c.phone && <div style={{ fontSize: 11, color: "#94a3b8" }}>{formatPhone(c.phone)}</div>}
            </div>
          ))}
          {filtered.length === 0 && <div style={{ padding: 16, textAlign: "center", fontSize: 12, color: "#94a3b8" }}>No contacts</div>}
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {!selected ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: 14 }}>
            Select a contact to start a thread
          </div>
        ) : (
          <>
            <div style={{ padding: "10px 16px", borderBottom: "1px solid #e2e8f0", background: "#fff" }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{selected.name}</div>
              {selected.phone && <div style={{ fontSize: 12, color: "#64748b" }}>{formatPhone(selected.phone)}</div>}
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 8, background: "#f8fafc" }}>
              {messages.length === 0 && <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, marginTop: 32 }}>No messages yet</div>}
              {messages.map((m) => (
                <div key={m.id} style={{ alignSelf: m.direction === "outbound" ? "flex-end" : "flex-start", maxWidth: "70%" }}>
                  <div style={{ background: m.direction === "outbound" ? "#2563eb" : "#fff",
                    color: m.direction === "outbound" ? "#fff" : "#1e293b",
                    borderRadius: m.direction === "outbound" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                    padding: "9px 13px", fontSize: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.07)" }}>
                    {m.body}
                  </div>
                  <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2, textAlign: m.direction === "outbound" ? "right" : "left" }}>
                    {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <div style={{ padding: 10, borderTop: "1px solid #e2e8f0", background: "#fff", display: "flex", gap: 8 }}>
              <textarea value={draft} onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
                placeholder="Type a message…" rows={2}
                style={{ flex: 1, resize: "none", border: "1px solid #e2e8f0", borderRadius: 8, padding: "7px 11px", fontSize: 14, outline: "none" }} />
              <button onClick={() => void send()} disabled={!draft.trim() || !selected.phone || sending}
                style={{ padding: "0 16px", background: "#2563eb", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: !draft.trim() || sending ? 0.5 : 1 }}>
                {sending ? "…" : "Send"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MessagesTab() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ messages: Message[] }>("/api/communications/messages?type=client_message")
      .then((r) => setMessages(Array.isArray(r.messages) ? r.messages : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: 24, flex: 1 }}>
      <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Client Messages</h3>
      {loading && <div style={{ color: "#94a3b8" }}>Loading…</div>}
      {!loading && messages.length === 0 && (
        <div style={{ color: "#94a3b8", fontSize: 14 }}>No client messages yet. Messages from the client portal "Talk to a Human" button will appear here.</div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {messages.map((m) => (
          <div key={m.id} style={{ background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", padding: "12px 16px" }}>
            <div style={{ fontSize: 13, color: "#1e293b", marginBottom: 6 }}>{m.body}</div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>{new Date(m.created_at).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InboxTab() {
  return (
    <div style={{ padding: 24, flex: 1 }}>
      <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Inbox</h3>
      <p style={{ color: "#64748b", fontSize: 14, margin: "0 0 20px" }}>
        Connect Microsoft 365 in Settings → Profile to sync your work email here.
      </p>
      <div style={{ background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0", padding: 32, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
        O365 inbox will appear here once Microsoft 365 is connected.
      </div>
    </div>
  );
}

function IssuesTab() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Issue | null>(null);

  useEffect(() => {
    api<{ issues: Issue[] }>("/api/portal/issues")
      .then((r) => setIssues(Array.isArray(r.issues) ? r.issues : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const statusColor = (s: string) =>
    s === "resolved" ? "#22c55e" : s === "in_progress" ? "#f59e0b" : "#3b82f6";

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
      <div style={{ width: 320, borderRight: "1px solid #e2e8f0", overflowY: "auto" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0", fontWeight: 700, fontSize: 14, color: "#0f172a" }}>
          Reported Issues
        </div>
        {loading && <div style={{ padding: 20, color: "#94a3b8", fontSize: 13 }}>Loading…</div>}
        {!loading && issues.length === 0 && (
          <div style={{ padding: 20, color: "#94a3b8", fontSize: 13 }}>
            No issues reported yet. Issues submitted via the client portal AI chat will appear here.
          </div>
        )}
        {issues.map((issue) => (
          <div key={issue.id} onClick={() => setSelected(issue)}
            style={{ padding: "11px 16px", cursor: "pointer", borderBottom: "1px solid #f1f5f9",
              background: selected?.id === issue.id ? "#eff6ff" : "transparent",
              borderLeft: selected?.id === issue.id ? "3px solid #2563eb" : "3px solid transparent" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontWeight: 600, fontSize: 13, color: "#1e293b" }}>{issue.title || "Untitled issue"}</span>
              <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 20,
                background: `${statusColor(issue.status)}22`, color: statusColor(issue.status), fontWeight: 600 }}>
                {issue.status}
              </span>
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>{new Date(issue.created_at).toLocaleString()}</div>
          </div>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        {!selected ? (
          <div style={{ color: "#94a3b8", fontSize: 14, marginTop: 40, textAlign: "center" }}>Select an issue to view details</div>
        ) : (
          <>
            <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 700, color: "#0f172a" }}>{selected.title || "Untitled issue"}</h3>
            <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 16 }}>{new Date(selected.created_at).toLocaleString()}</div>
            {selected.description && (
              <div style={{ background: "#f8fafc", borderRadius: 8, padding: "12px 14px", fontSize: 14, color: "#374151", marginBottom: 16 }}>
                {selected.description}
              </div>
            )}
            {selected.screenshot_url && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 8 }}>SCREENSHOT</div>
                <img src={selected.screenshot_url} alt="Issue screenshot"
                  style={{ maxWidth: "100%", borderRadius: 8, border: "1px solid #e2e8f0" }} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function CommunicationsPage() {
  const [tab, setTab] = useState<Tab>("sms");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 80px)", overflow: "hidden" }}>
      <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", background: "#fff", flexShrink: 0 }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={tab === t.id ? tabActive : tabBase}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden", background: "#f8fafc" }}>
        {tab === "sms" && <SmsTab />}
        {tab === "messages" && <MessagesTab />}
        {tab === "inbox" && <InboxTab />}
        {tab === "issues" && <IssuesTab />}
      </div>
    </div>
  );
}
