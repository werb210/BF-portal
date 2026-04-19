import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/api";

type Tab = "messages" | "sms" | "inbox" | "issues";

const TABS: { id: Tab; label: string }[] = [
  { id: "messages", label: "Messages" },
  { id: "sms", label: "SMS" },
  { id: "inbox", label: "Inbox" },
  { id: "issues", label: "Issues" },
];

type Contact = { id: string; name: string; phone: string | null };
type Message = {
  id: string;
  direction: "inbound" | "outbound";
  body: string;
  created_at: string;
  staff_name?: string | null;
};
type Issue = {
  id: string;
  title: string;
  description: string;
  screenshot_url: string | null;
  created_at: string;
  status: string;
};

// ── Initials avatar ────────────────────────────────────────────────────────
function Avatar({ name, size = 38 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const colors = ["#2563eb", "#7c3aed", "#059669", "#d97706", "#dc2626", "#0891b2"];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontSize: size * 0.36,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

// ── SMS Tab — iPhone Messages style ──────────────────────────────────────────
function SmsTab() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [threads, setThreads] = useState<Record<string, Message[]>>({});
  const [selected, setSelected] = useState<Contact | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const [newThreadPhone, setNewThreadPhone] = useState("");
  const [showNewThread, setShowNewThread] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    api<{ contacts: Contact[] }>("/api/crm/contacts?pageSize=200")
      .then((r) => setContacts(Array.isArray(r.contacts) ? r.contacts : []))
      .catch(() => {});
  }, []);

  const loadMessages = useCallback((contactId: string) => {
    api<{ messages: Message[] }>(`/api/communications/messages?contactId=${contactId}`)
      .then((r) => {
        const msgs = Array.isArray(r.messages) ? r.messages : [];
        setThreads((prev) => ({ ...prev, [contactId]: msgs }));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selected) return;
    loadMessages(selected.id);
    pollRef.current = setInterval(() => loadMessages(selected.id), 6000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [selected, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [threads, selected]);

  async function send() {
    if (!draft.trim() || !selected?.phone || sending) return;
    setSending(true);
    try {
      await api.post("/api/communications/sms", {
        to: selected.phone,
        body: draft.trim(),
        contactId: selected.id,
      });
      setDraft("");
      loadMessages(selected.id);
      setTimeout(() => inputRef.current?.focus(), 50);
    } finally {
      setSending(false);
    }
  }

  function lastMessage(contactId: string) {
    const msgs = threads[contactId] ?? [];
    return msgs[msgs.length - 1];
  }

  function timeLabel(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
  }

  const filtered = contacts.filter((c) => {
    const q = search.toLowerCase();
    return c.name?.toLowerCase().includes(q) || c.phone?.includes(q);
  });

  const messages = selected ? (threads[selected.id] ?? []) : [];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px minmax(0, 1fr)", flex: 1, minHeight: 0, overflow: "hidden", background: "#f5f5f7" }}>
      {/* ── Left — conversation list ── */}
      <div
        style={{
          width: 320,
          borderRight: "1px solid #e0e0e5",
          display: "flex",
          flexDirection: "column",
          background: "#fff",
          height: "100%",
          minHeight: 0,
        }}
      >
        {/* Search + New */}
        <div style={{ padding: "12px 12px 8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 17, color: "#000", flex: 1 }}>Messages</span>
            <button
              onClick={() => setShowNewThread(true)}
              title="New Message"
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#007aff", padding: 0 }}
            >
              ✏️
            </button>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            style={{
              width: "100%",
              padding: "7px 12px",
              borderRadius: 10,
              border: "none",
              background: "#f0f0f5",
              fontSize: 14,
              outline: "none",
              boxSizing: "border-box",
              color: "#000",
            }}
          />
        </div>

        {/* New thread input */}
        {showNewThread && (
          <div style={{ padding: "8px 12px", background: "#f8f8f8", borderBottom: "1px solid #e0e0e5" }}>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Enter phone number</div>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                value={newThreadPhone}
                onChange={(e) => setNewThreadPhone(e.target.value)}
                placeholder="+1 (555) 555-5555"
                style={{
                  flex: 1,
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  fontSize: 13,
                  color: "#000",
                  outline: "none",
                }}
              />
              <button
                onClick={() => {
                  if (!newThreadPhone.trim()) return;
                  const fake: Contact = { id: `new-${newThreadPhone}`, name: newThreadPhone, phone: newThreadPhone };
                  setSelected(fake);
                  setShowNewThread(false);
                  setNewThreadPhone("");
                }}
                style={{
                  padding: "6px 12px",
                  background: "#007aff",
                  border: "none",
                  borderRadius: 8,
                  color: "#fff",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Start
              </button>
              <button
                onClick={() => setShowNewThread(false)}
                style={{
                  padding: "6px 10px",
                  background: "#e5e5ea",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 13,
                  cursor: "pointer",
                  color: "#000",
                }}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Thread list */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {filtered.length === 0 && (
            <div style={{ padding: "20px 16px", textAlign: "center", color: "#8e8e93", fontSize: 14 }}>
              No contacts. Add contacts in CRM first.
            </div>
          )}
          {filtered.map((c) => {
            const last = lastMessage(c.id);
            const isSelected = selected?.id === c.id;
            return (
              <div
                key={c.id}
                onClick={() => setSelected(c)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 16px",
                  cursor: "pointer",
                  borderBottom: "1px solid #f0f0f5",
                  background: isSelected ? "#e8f0fe" : "transparent",
                }}
              >
                <Avatar name={c.name} size={44} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontWeight: 600, fontSize: 15, color: "#000" }}>{c.name}</span>
                    {last && <span style={{ fontSize: 11, color: "#8e8e93", flexShrink: 0 }}>{timeLabel(last.created_at)}</span>}
                  </div>
                  {last ? (
                    <div
                      style={{
                        fontSize: 13,
                        color: "#8e8e93",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {last.direction === "outbound" ? "You: " : ""}
                      {last.body}
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: "#c7c7cc" }}>{c.phone}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Right — thread ── */}
      <div style={{ display: "flex", flexDirection: "column", background: "#fff", minWidth: 0, minHeight: 0, height: "100%" }}>
        {!selected ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "#8e8e93",
              gap: 8,
            }}
          >
            <div style={{ fontSize: 40 }}>💬</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#000" }}>No conversation selected</div>
            <div style={{ fontSize: 14 }}>Choose from the list or start a new message</div>
          </div>
        ) : (
          <>
            {/* Thread header */}
            <div
              style={{
                padding: "12px 20px",
                borderBottom: "1px solid #f0f0f5",
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: "#fff",
                position: "sticky",
                top: 0,
                zIndex: 2,
              }}
            >
              <Avatar name={selected.name} size={36} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#000" }}>{selected.name}</div>
                {selected.phone && <div style={{ fontSize: 12, color: "#8e8e93" }}>{selected.phone}</div>}
              </div>
            </div>

            {/* Messages */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "16px 20px",
                display: "flex",
                flexDirection: "column",
                gap: 6,
                background: "#fff",
                minHeight: 0,
              }}
            >
              {messages.length === 0 && (
                <div style={{ textAlign: "center", color: "#8e8e93", fontSize: 14, marginTop: 40 }}>
                  No messages yet. Send the first one.
                </div>
              )}
              {messages.map((m, i) => {
                const isOut = m.direction === "outbound";
                const prevSameSide = i > 0 && messages[i - 1]?.direction === m.direction;
                return (
                  <div
                    key={m.id}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: isOut ? "flex-end" : "flex-start",
                      marginTop: prevSameSide ? 2 : 8,
                    }}
                  >
                    <div
                      style={{
                        maxWidth: "70%",
                        background: isOut ? "#007aff" : "#e5e5ea",
                        color: isOut ? "#fff" : "#000",
                        padding: "9px 14px",
                        borderRadius: isOut ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                        fontSize: 15,
                        lineHeight: 1.4,
                      }}
                    >
                      {m.body}
                    </div>
                    {(!messages[i + 1] || messages[i + 1]?.direction !== m.direction) && (
                      <div
                        style={{
                          fontSize: 10,
                          color: "#8e8e93",
                          marginTop: 3,
                          paddingLeft: isOut ? 0 : 4,
                          paddingRight: isOut ? 4 : 0,
                        }}
                      >
                        {timeLabel(m.created_at)}
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Compose — padding-right keeps send button clear of floating dialer */}
            <div
              style={{
                padding: "8px 16px 12px 16px",
                paddingRight: 80,
                borderTop: "1px solid #f0f0f5",
                display: "flex",
                alignItems: "flex-end",
                gap: 10,
                background: "#fff",
                position: "sticky",
                bottom: 0,
                zIndex: 2,
              }}
            >
              <div
                style={{
                  flex: 1,
                  border: "1px solid #d1d5db",
                  borderRadius: 20,
                  padding: "6px 14px",
                  background: "#f9f9f9",
                }}
              >
                <textarea
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                  placeholder="iMessage"
                  rows={1}
                  style={{
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    fontSize: 15,
                    resize: "none",
                    color: "#000",
                    fontFamily: "inherit",
                    lineHeight: 1.4,
                    maxHeight: 100,
                    overflow: "auto",
                  }}
                />
              </div>
              <button
                onClick={() => void send()}
                disabled={!draft.trim() || sending}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  border: "none",
                  background: draft.trim() ? "#007aff" : "#e5e5ea",
                  color: "#fff",
                  fontSize: 18,
                  cursor: draft.trim() ? "pointer" : "default",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "background 0.15s",
                }}
              >
                ↑
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Messages tab ──────────────────────────────────────────────────────────────
function MessagesTab() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ messages: Message[] }>("/api/communications/messages")
      .then((r) => setMessages(Array.isArray(r.messages) ? r.messages : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: 24, flex: 1, overflowY: "auto" }}>
      <h3 style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 700, color: "#0f172a" }}>Client Messages</h3>
      {loading && <div style={{ color: "#8e8e93" }}>Loading…</div>}
      {!loading && messages.length === 0 && (
        <div style={{ color: "#8e8e93", fontSize: 14 }}>
          No client messages yet. Messages from the client portal "Talk to a Human" button will appear here.
        </div>
      )}
      {messages.map((m) => (
        <div
          key={m.id}
          style={{
            background: "#fff",
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            padding: "12px 16px",
            marginBottom: 10,
          }}
        >
          <div style={{ fontSize: 14, color: "#1e293b", marginBottom: 6 }}>{m.body}</div>
          <div style={{ fontSize: 11, color: "#8e8e93" }}>{new Date(m.created_at).toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
}

// ── Inbox tab ─────────────────────────────────────────────────────────────────
function InboxTab() {
  return (
    <div
      style={{
        padding: 32,
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "#8e8e93",
      }}
    >
      <div style={{ fontSize: 40, marginBottom: 12 }}>📧</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: "#0f172a", marginBottom: 8 }}>O365 Inbox</div>
      <div style={{ fontSize: 14, textAlign: "center", maxWidth: 320 }}>
        Connect Microsoft 365 in Settings → Profile to sync your work inbox here.
      </div>
    </div>
  );
}

// ── Issues tab ────────────────────────────────────────────────────────────────
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
      <div style={{ width: 300, borderRight: "1px solid #e2e8f0", overflowY: "auto", background: "#fff" }}>
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid #e2e8f0",
            fontWeight: 700,
            fontSize: 15,
            color: "#0f172a",
          }}
        >
          Reported Issues
        </div>
        {loading && <div style={{ padding: 16, color: "#8e8e93", fontSize: 13 }}>Loading…</div>}
        {!loading && issues.length === 0 && (
          <div style={{ padding: 20, color: "#8e8e93", fontSize: 13 }}>
            No issues yet. Client portal "Report an Issue" submissions appear here.
          </div>
        )}
        {issues.map((issue) => (
          <div
            key={issue.id}
            onClick={() => setSelected(issue)}
            style={{
              padding: "10px 16px",
              cursor: "pointer",
              borderBottom: "1px solid #f1f5f9",
              background: selected?.id === issue.id ? "#eff6ff" : "transparent",
              borderLeft: selected?.id === issue.id ? "3px solid #2563eb" : "3px solid transparent",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
              <span style={{ fontWeight: 600, fontSize: 13, color: "#1e293b" }}>{issue.title || "Untitled"}</span>
              <span
                style={{
                  fontSize: 10,
                  padding: "1px 6px",
                  borderRadius: 20,
                  background: `${statusColor(issue.status)}22`,
                  color: statusColor(issue.status),
                  fontWeight: 600,
                }}
              >
                {issue.status}
              </span>
            </div>
            <div style={{ fontSize: 11, color: "#8e8e93" }}>{new Date(issue.created_at).toLocaleString()}</div>
          </div>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 24, background: "#f8fafc" }}>
        {!selected ? (
          <div style={{ color: "#8e8e93", fontSize: 14, marginTop: 40, textAlign: "center" }}>
            Select an issue to view details
          </div>
        ) : (
          <>
            <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 700, color: "#0f172a" }}>{selected.title || "Untitled"}</h3>
            <div style={{ fontSize: 12, color: "#8e8e93", marginBottom: 16 }}>
              {new Date(selected.created_at).toLocaleString()}
            </div>
            {selected.description && (
              <div
                style={{
                  background: "#fff",
                  borderRadius: 10,
                  padding: "12px 16px",
                  fontSize: 14,
                  color: "#374151",
                  marginBottom: 16,
                  border: "1px solid #e2e8f0",
                }}
              >
                {selected.description}
              </div>
            )}
            {selected.screenshot_url && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 8 }}>SCREENSHOT</div>
                <img
                  src={selected.screenshot_url}
                  alt="Issue screenshot"
                  style={{ maxWidth: "100%", borderRadius: 8, border: "1px solid #e2e8f0" }}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function CommunicationsPage() {
  const [tab, setTab] = useState<Tab>("sms");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 80px)",
        overflow: "hidden",
        background: "#fff",
      }}
    >
      {/* Sub-nav */}
      <div
        style={{
          display: "flex",
          borderBottom: "2px solid #e2e8f0",
          background: "#fff",
          flexShrink: 0,
          padding: "0 4px",
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "12px 20px",
              border: "none",
              background: "transparent",
              fontSize: 14,
              fontWeight: tab === t.id ? 700 : 500,
              cursor: "pointer",
              color: tab === t.id ? "#007aff" : "#6b7280",
              borderBottom: tab === t.id ? "2px solid #007aff" : "2px solid transparent",
              marginBottom: -2,
              transition: "all 0.1s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {tab === "sms" && <SmsTab />}
        {tab === "messages" && <MessagesTab />}
        {tab === "inbox" && <InboxTab />}
        {tab === "issues" && <IssuesTab />}
      </div>
    </div>
  );
}
