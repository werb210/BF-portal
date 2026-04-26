import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/api";
import { ApiError } from "@/api/http";

type Tab = "messages" | "sms" | "inbox" | "issues";

const TABS: { id: Tab; label: string }[] = [
  { id: "messages", label: "Messages" },
  { id: "sms", label: "SMS" },
  { id: "inbox", label: "Inbox" },
  { id: "issues", label: "Issues" },
];

type Contact = { id: string; name: string; phone: string | null; contactId?: string | null };
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

function isBadRequest(error: unknown) {
  return error instanceof ApiError && error.status === 400;
}

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
  const [threadMessages, setThreadMessages] = useState<Array<{
    id: string;
    direction: "inbound" | "outbound";
    body: string;
    created_at: string;
    from_number?: string;
    to_number?: string;
  }>>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const [newThreadPhone, setNewThreadPhone] = useState("");
  const [showNewThread, setShowNewThread] = useState(false);
  const [hasSentMessages, setHasSentMessages] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const mergeMessages = useCallback((existing: Message[], incoming: Message[]) => {
    const byId = new Map<string, Message>();
    [...existing, ...incoming].forEach((message) => {
      if (message?.id) byId.set(message.id, message);
    });
    return Array.from(byId.values()).sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, []);

  useEffect(() => {
    api<{ conversations?: Array<{ contact_id?: string; contact_name?: string; contact_phone?: string | null; latest_message_at?: string; preview?: string }> }>("/api/communications/sms")
      .then((r) => {
        const convo = Array.isArray(r.conversations) ? r.conversations : [];
        const mapped = convo.map((row) => ({
          id: row.contact_id ?? "",
          name: row.contact_name ?? row.contact_phone ?? "Unknown",
          phone: row.contact_phone ?? null,
          latest: row.latest_message_at ?? "",
        })).filter((c) => c.id);
        if (mapped.length > 0) {
          mapped.sort((a, b) => new Date(b.latest).getTime() - new Date(a.latest).getTime());
          setContacts(mapped as Contact[]);
          setHasSentMessages(true);
        } else {
          const fallback = (r as { contacts?: Contact[] }).contacts;
          setContacts(Array.isArray(fallback) ? fallback : []);
          setHasSentMessages(Array.isArray(fallback) && fallback.length > 0);
        }
      })
      .catch((error) => {
        if (isBadRequest(error)) return;
      })
  }, []);

  useEffect(() => {
    if (!selected) {
      setThreadMessages([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const r = await api<{ data?: Message[] } | Message[]>(
          "/api/communications/sms/thread",
          { params: { contactId: String(selected.id ?? "") } },
        );
        const list = Array.isArray(r) ? r : (r?.data ?? []);
        if (!cancelled) setThreadMessages(list);
      } catch {
        if (!cancelled) setThreadMessages([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected?.id]);

  const loadMessages = useCallback((contactId: string, phone?: string | null) => {
    const params: Record<string, string> = {};
    if (contactId) params.contactId = contactId;
    else if (phone) params.phone = phone;

    Promise.resolve(
      api<{ data?: Message[] } | Message[]>("/api/communications/sms/thread", { params })
    )
      .then((r) => {
        const msgs = Array.isArray(r) ? r : (r?.data ?? []);
        setThreads((prev) => {
          const merged = mergeMessages(prev[contactId] ?? [], msgs);
          if (selected?.id === contactId) setThreadMessages(merged);
          return {
            ...prev,
            [contactId]: merged,
          };
        });
      })
      .catch((error) => {
        if (isBadRequest(error)) return;
        setThreads((prev) => ({
          ...prev,
          [contactId]: [],
        }));
        if (selected?.id === contactId) setThreadMessages([]);
      });
  }, [mergeMessages, selected?.id]);

  useEffect(() => {
    if (!selected) return;
    loadMessages(selected.id, selected.phone);
    pollRef.current = setInterval(() => loadMessages(selected.id, selected.phone), 5000);
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
    const pendingBody = draft.trim();
    try {
      await api.post("/api/communications/sms", {
        to: selected.phone,
        body: pendingBody,
        contactId: selected.id,
      });
      setDraft("");
      loadMessages(selected.id, selected.phone);
      setTimeout(() => inputRef.current?.focus(), 50);
    } catch (error) {
      if (isBadRequest(error)) return;
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

  const messages = selected ? threadMessages : [];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px minmax(0, 1fr)", flex: 1, minHeight: 0, height: "100%", overflow: "hidden", background: "#f5f5f7" }}>
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
                  const digits = newThreadPhone.replace(/\D/g, "");
                  const fake: Contact = { id: `new-${digits}`, name: newThreadPhone, phone: newThreadPhone };
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
              {hasSentMessages ? "No conversations yet" : "No contacts. Add contacts in CRM first."}
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
      <div style={{ display: "flex", flexDirection: "column", background: "#fff", minWidth: 0, minHeight: 0, height: "100%", overflow: "hidden" }}>
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
                background: "#f5f5f7",
                color: "#000",
                flexShrink: 0,
              }}
            >
              <Avatar name={selected.name} size={36} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#000" }}>{selected.name}</div>
                {selected.phone && <div style={{ fontSize: 12, color: "#3c3c43" }}>{selected.phone}</div>}
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
                const currentDay = new Date(m.created_at).toDateString();
                const prevDay = i > 0 ? new Date(messages[i - 1]!.created_at).toDateString() : null;
                const showDayBreak = currentDay !== prevDay;
                const isOut = m.direction === "outbound";
                const prevSameSide = i > 0 && messages[i - 1]?.direction === m.direction;
                return (
                  <>
                  {showDayBreak && (
                    <div style={{ alignSelf: "center", fontSize: 11, color: "#94a3b8", margin: "8px 0" }}>{new Date(m.created_at).toLocaleDateString()}</div>
                  )}
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
                        fontSize: 11,
                        fontWeight: 600,
                        color: "#6b7280",
                        marginBottom: 2,
                        marginRight: isOut ? 4 : 0,
                        marginLeft: isOut ? 0 : 4,
                      }}
                    >
                      {isOut ? "You" : selected.name}
                    </div>
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
                  </>
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
                flexShrink: 0,
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
  const [crmContacts, setCrmContacts] = useState<Array<{
    id: string; name: string; phone?: string; email?: string;
  }>>([]);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await api<{ data?: any[] } | any[]>("/api/crm/contacts");
        const list = Array.isArray(r) ? r : (r?.data ?? []);
        if (!cancelled) setCrmContacts(list);
      } catch {
        if (!cancelled) setCrmContacts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selectedContactId) {
      setMessages([]);
      return;
    }

    setLoading(true);
    api<{ messages: Message[] }>(`/api/communications/messages?contact_id=${selectedContactId}`)
      .then((r) => setMessages(Array.isArray(r?.messages) ? r.messages : []))
      .catch((error) => {
        if (isBadRequest(error)) return;
        setMessages([]);
      })
      .finally(() => setLoading(false));
  }, [selectedContactId]);

  return (
    <div style={{ padding: 24, flex: 1, overflowY: "auto" }}>
      <h3 style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 700, color: "#0f172a" }}>Client Messages</h3>
      <div style={{ marginBottom: 16 }}>
        <select
          value={selectedContactId ?? ""}
          onChange={(e) => setSelectedContactId(e.target.value || null)}
          style={{ width: "100%", padding: 8, maxWidth: 360 }}
        >
          <option value="">Select a contact…</option>
          {crmContacts.map((c) => (
            <option key={c.id} value={c.id}>{c.name}{c.phone ? ` — ${c.phone}` : ""}</option>
          ))}
        </select>
      </div>
      {loading && <div style={{ color: "#8e8e93" }}>Loading…</div>}
      {!loading && !selectedContactId && <div style={{ color: "#8e8e93" }}>Select a contact to load messages.</div>}
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
  const [mailboxes, setMailboxes] = useState<{ mine: { address: string; display_name: string } | null; shared: { address: string; display_name: string }[] }>({ mine: null, shared: [] });
  const [active, setActive] = useState<string>("");
  const [messages, setMessages] = useState<Array<{ id: string; subject: string; bodyPreview?: string; from?: { emailAddress?: { address: string; name?: string } }; receivedDateTime?: string; isRead?: boolean }>>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [selected, setSelected] = useState<{ subject: string; from?: { emailAddress?: { address: string; name?: string } }; body?: { content: string; contentType: "html" | "text" }; receivedDateTime?: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Load mailboxes once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await api<{ mine: { address: string; display_name: string } | null; shared: { address: string; display_name: string }[] }>("/api/crm/shared-mailboxes");
        if (cancelled) return;
        setMailboxes(r);
        // Default to personal mailbox if available, else first shared
        setActive(r.mine ? "" : (r.shared[0]?.address ?? ""));
      } catch (e: any) {
        if (!cancelled) setErr("Connect Microsoft 365 in Settings → My Profile to view inbox.");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Load messages whenever active mailbox changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    setSelectedId("");
    setSelected(null);
    (async () => {
      try {
        const params = active ? { mailbox: active } : {};
        const r = await api<typeof messages>("/api/crm/inbox", { params });
        if (!cancelled) setMessages(Array.isArray(r) ? r : []);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? "Could not load inbox.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [active]);

  // Load body when a message is selected
  useEffect(() => {
    if (!selectedId) { setSelected(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const params = active ? { mailbox: active } : {};
        const r = await api<typeof selected>(`/api/crm/inbox/${encodeURIComponent(selectedId)}`, { params });
        if (!cancelled) setSelected(r);
      } catch {
        if (!cancelled) setSelected(null);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedId, active]);

  const mailboxOptions: Array<{ value: string; label: string }> = [];
  if (mailboxes.mine) mailboxOptions.push({ value: "", label: `${mailboxes.mine.display_name} (mine)` });
  for (const m of mailboxes.shared) mailboxOptions.push({ value: m.address, label: m.display_name });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 0, height: "100%", background: "#fff", color: "#000" }}>
      <div style={{ borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: 12, borderBottom: "1px solid #e2e8f0" }}>
          <select
            value={active}
            onChange={(e) => setActive(e.target.value)}
            style={{ width: "100%", padding: 8, border: "1px solid #cbd6e2", borderRadius: 4, background: "#fff", color: "#000" }}
          >
            {mailboxOptions.map(o => <option key={o.value || "self"} value={o.value}>{o.label}</option>)}
            {mailboxOptions.length === 0 && <option value="">No mailbox available</option>}
          </select>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading && <div style={{ padding: 16, color: "#7c98b6" }}>Loading…</div>}
          {err && <div style={{ padding: 16, color: "#b00020" }}>{err}</div>}
          {!loading && !err && messages.length === 0 && (
            <div style={{ padding: 16, color: "#7c98b6" }}>Nothing in this inbox.</div>
          )}
          {messages.map(m => (
            <button
              key={m.id}
              onClick={() => setSelectedId(m.id)}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: 12, border: "none", background: selectedId === m.id ? "#eaf2fb" : "transparent",
                borderBottom: "1px solid #f0f4f8", cursor: "pointer", color: "#000",
                fontWeight: m.isRead ? 400 : 600,
              }}
            >
              <div style={{ fontSize: 13, color: "#33475b" }}>
                {m.from?.emailAddress?.name || m.from?.emailAddress?.address || "(unknown)"}
              </div>
              <div style={{ fontSize: 14, marginTop: 2 }}>{m.subject || "(no subject)"}</div>
              <div style={{ fontSize: 12, color: "#7c98b6", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {m.bodyPreview || ""}
              </div>
              {m.receivedDateTime && (
                <div style={{ fontSize: 11, color: "#7c98b6", marginTop: 2 }}>
                  {new Date(m.receivedDateTime).toLocaleString()}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: 16, overflowY: "auto" }}>
        {!selectedId && <div style={{ color: "#8e8e93" }}>Select an email.</div>}
        {selectedId && !selected && <div style={{ color: "#8e8e93" }}>Loading…</div>}
        {selected && (
          <article>
            <h2 style={{ marginTop: 0 }}>{selected.subject || "(no subject)"}</h2>
            <div style={{ color: "#516f90", fontSize: 13, marginBottom: 16 }}>
              {selected.from?.emailAddress?.name || selected.from?.emailAddress?.address || ""}
              {selected.receivedDateTime && (
                <span style={{ marginLeft: 8 }}>· {new Date(selected.receivedDateTime).toLocaleString()}</span>
              )}
            </div>
            {selected.body?.contentType === "html"
              ? <div dangerouslySetInnerHTML={{ __html: selected.body.content }} />
              : <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}>{selected.body?.content ?? ""}</pre>}
          </article>
        )}
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
      .catch((error) => {
        if (isBadRequest(error)) return;
      })
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
        height: "100%",
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
