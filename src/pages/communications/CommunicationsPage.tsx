import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/api";
import { withO365Refresh } from "@/api/o365Interceptor";
import { ApiError } from "@/api/http";
import SecondaryButton from "@/components/forms/SecondaryButton";
import CommunicationsThread from "@/pages/communications/components/CommunicationsThread";
import O365ComposeModal from "@/components/communications/O365ComposeModal";

type Tab = "messages" | "sms" | "inbox" | "issues";

const TABS: { id: Tab; label: string }[] = [
  { id: "messages", label: "Messages" },
  { id: "sms", label: "SMS" },
  { id: "inbox", label: "Inbox" },
  { id: "issues", label: "Issues" },
];

type Contact = {
  id: string;
  name: string;
  phone: string | null;
  phone_e164?: string | null;
  mobile?: string | null;
  contactId?: string | null;
};

// BF_PORTAL_BLOCK_v305_SMS_EMPTY_STATE_DEFENSIVE_FILTER_v1 — accept
// any phone-like column. Some CRM endpoints return `phone`, others
// return `phone_e164` (BI silo) or `mobile`. Trim before truthy check
// so whitespace-only strings don't slip through.
function hasUsablePhone(c: Contact): boolean {
  const cand = (c.phone ?? c.phone_e164 ?? c.mobile ?? "").trim();
  return cand.length > 0;
}
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
function SmsTab({ forcedContact, onContactSelected }: { forcedContact?: Contact | null; onContactSelected?: (c: Contact) => void }) {
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
      .then(async (r) => {
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
          // BF_PORTAL_BLOCK_57R_CAL_DOCS_DELETE_REFERRER_COMMS_v2
          // Pre-fix: when /api/communications/sms returned 0 conversations
          // AND no fallback `contacts` array, sidebar showed "No contacts.
          // Add contacts in CRM first." even when CRM had rows. Now: pull
          // CRM contacts (phone-bearing) as the baseline.
          const fallback = (r as { contacts?: Contact[] }).contacts;
          if (Array.isArray(fallback) && fallback.length > 0) {
            setContacts(fallback);
            setHasSentMessages(true);
          } else {
            try {
              const crm = await api<{ items?: Contact[] } | Contact[]>("/api/crm/contacts", { params: { pageSize: 500 } });
              const list: Contact[] = Array.isArray(crm) ? (crm as Contact[]) : ((crm as { items?: Contact[] }).items ?? []);
              const withPhone = list.filter((c) => c?.id && hasUsablePhone(c));
              setContacts(withPhone);
              setHasSentMessages(false);
            } catch {
              setContacts([]);
              setHasSentMessages(false);
            }
          }
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
        const r = await api<{ messages?: Message[]; data?: Message[] } | Message[]>(
          "/api/communications/sms/thread",
          { params: { contactId: String(selected.id ?? "") } },
        );
        const list = Array.isArray(r) ? r : (r?.messages ?? r?.data ?? []);
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
      api<{ messages?: Message[]; data?: Message[] } | Message[]>("/api/communications/sms/thread", { params })
    )
      .then(async (r) => {
        const msgs = Array.isArray(r) ? r : (r?.messages ?? r?.data ?? []);
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
    const selectedContact = selected;
    const selectedPhone = selectedContact?.phone ?? selectedContact?.phone_e164 ?? selectedContact?.mobile ?? null;
    if (!draft.trim() || !selectedContact || !selectedPhone || sending) return;
    setSending(true);
    const pendingBody = draft.trim();
    try {
      setThreadMessages((prev) => [...prev, {
        id: `tmp-${Date.now()}`,
        body: pendingBody,
        direction: "outbound",
        created_at: new Date().toISOString(),
      }]);
      await api.post("/api/communications/sms", {
        // BF_PORTAL_BLOCK_v320_COMMS_SMS_SEND_URL_v1
        // Pre-fix this POSTed to /api/sms/send, which BF-Server src/app.ts:136
        // mounts as a stub returning HTTP 501 not_implemented ("SMS send
        // endpoint not yet wired"). Outbound SMS from the staff Communications
        // page never actually sent — the optimistic UI update painted the
        // message in the thread, the POST 501'd, the catch block swallowed
        // anything except isBadRequest, and 5s later the poll refresh from
        // /api/communications/sms/thread wiped the optimistic message because
        // it was never persisted. The real Twilio send endpoint is
        // /api/communications/sms (BF-Server src/routes/communications.ts:131)
        // which sends via Twilio AND persists to communications_messages so
        // the thread view stays consistent. Same v277 pattern as v300/v311
        // (UI calling wrong URL prefix).
        to: selectedPhone,
        body: pendingBody,
        contactId: selectedContact.id,
      });
      setDraft("");
      loadMessages(selectedContact.id, selectedPhone);
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


  useEffect(() => {
    if (forcedContact?.id) setSelected(forcedContact);
  }, [forcedContact?.id]);

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
              {contacts.length === 0 ? "No CRM contacts with phone numbers yet. Add a contact with a phone in CRM to start an SMS thread." : (hasSentMessages ? "No conversations match this filter." : "No conversations yet - click a contact to start one.")}
            </div>
          )}
          {filtered.map((c) => {
            const last = lastMessage(c.id);
            const isSelected = selected?.id === c.id;
            return (
              <div
                key={c.id}
                onClick={() => {
                  setSelected(c);
                  onContactSelected?.(c);
                }}
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
              <CommunicationsThread
                messages={messages.map((m) => ({
                  id: m.id,
                  body: m.body,
                  direction: m.direction,
                  authorRole: m.direction === "outbound" ? "self" : "other",
                  authorName: m.direction === "outbound" ? "You" : selected.name,
                  created_at: m.created_at,
                }))}
                emptyText="No messages yet. Send the first one."
              />
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
// BF_PORTAL_BLOCK_v607_MESSAGES_TAB_REBUILD_v1
// Left panel: every CRM contact in the active silo (v636 ?mode=all).
// Thread: /api/communications/messages/thread/:applicationId — richer
// payload with ctaLabel/ctaAction.
// Send: /api/communications/messages/send — server (v636) fires the
// offline-fallback SMS when the user hasn't polled the mini-portal in 60s.
type MessagesListRow = {
  thread_key: string | null;
  contact_id: string | null;
  display_name: string | null;
  phone: string | null;
  email: string | null;
  last_at: string | null;
  last_body: string | null;
  unread_count: number | null;
};

type MsgRow = {
  id: string;
  body: string;
  senderType?: "client" | "staff";
  senderName?: string | null;
  createdAt?: string;
  source?: "client" | "staff";
  ctaLabel?: string | null;
  ctaAction?: string | null;
};

function MessagesTab({ onStartConversation }: { onStartConversation: (contact: Contact) => void }) {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState("");
  const [body, setBody] = useState("");

  type Row = {
    contactId: string;
    name: string;
    phone: string | null;
    lastAt: string | null;
    lastBody: string | null;
    unread: number;
  };
  const [rows, setRows] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Row | null>(null);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MsgRow[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Left panel: every CRM contact in silo, sorted by latest activity ─────
  useEffect(() => {
    let cancelled = false;
    api<{ conversations?: MessagesListRow[] }>("/api/communications/messages-list", { params: { mode: "all" } })
      .then((r) => {
        if (cancelled) return;
        const list = Array.isArray(r.conversations) ? r.conversations : [];
        // BF_PORTAL_BLOCK_v608_THREE_FIXES_v1 — DON'T filter out NULL contact_id
        // threads. When applications.contact_id is NULL (typical), mini-portal
        // messages get inserted with contact_id=NULL and the server keys the
        // thread on application_id::text. Filtering them out is what made
        // client→staff sends look "dead" in the staff Messages tab.
        const mapped: Row[] = list
          .filter((c) => c.contact_id || c.thread_key)
          .map((c) => ({
            contactId: (c.contact_id ?? c.thread_key) as string,
            name: c.display_name ?? c.phone ?? "Unknown",
            phone: c.phone,
            lastAt: c.last_at,
            lastBody: c.last_body,
            unread: Number(c.unread_count ?? 0),
          }));
        setRows(mapped);
        if (!selected && mapped[0]) setSelected(mapped[0]);
      })
      .catch(() => setRows([]));
    return () => {
      cancelled = true;
    };
    // Re-fetch on selection change so the unread count + last preview update
    // after a send. The ESLint exhaustive-deps lint reports `selected` here;
    // intentional — we re-fetch the list after every selection-driven send.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.contactId]);

  // ── On selection: resolve latest application_id ──────────────────────────
  useEffect(() => {
    if (!selected?.contactId) {
      setApplicationId(null);
      setMessages([]);
      return;
    }
    let cancelled = false;
    api<Array<{ id: string }>>(`/api/crm/contacts/${encodeURIComponent(selected.contactId)}/applications`)
      .then((apps) => {
        if (cancelled) return;
        const latest = Array.isArray(apps) ? apps[0]?.id ?? null : null;
        setApplicationId(latest);
      })
      .catch(() => {
        if (!cancelled) setApplicationId(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selected?.contactId]);

  // ── Thread load + poll ──────────────────────────────────────────────────
  const loadThread = useCallback((appId: string) => {
    api<MsgRow[]>(`/api/communications/messages/thread/${encodeURIComponent(appId)}`)
      .then((r) => {
        setMessages(Array.isArray(r) ? r : []);
      })
      .catch(() => setMessages([]));
  }, []);

  useEffect(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (!applicationId) {
      setMessages([]);
      return;
    }
    setLoadingThread(true);
    loadThread(applicationId);
    setLoadingThread(false);
    pollRef.current = setInterval(() => loadThread(applicationId), 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [applicationId, loadThread]);

  // ── Send ────────────────────────────────────────────────────────────────
  async function send() {
    if (!applicationId || !draft.trim() || sending) return;
    setSending(true);
    const text = draft.trim();
    setDraft("");
    try {
      // Optimistic append. Server returns the canonical row; we replace on poll.
      const optimisticId = `local-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: optimisticId,
          body: text,
          senderType: "staff",
          senderName: "You",
          createdAt: new Date().toISOString(),
          source: "staff",
        },
      ]);
      await api.post("/api/communications/messages/send", { applicationId, body: text });
      // Poll picks up the canonical row on the next tick.
      loadThread(applicationId);
    } catch (err) {
      console.error("[messages tab] send failed", err);
    } finally {
      setSending(false);
    }
  }

  function fmtAt(at: string | null): string {
    if (!at) return "";
    try {
      const d = new Date(at);
      if (Number.isNaN(d.getTime())) return "";
      const diffH = (Date.now() - d.getTime()) / 36e5;
      if (diffH < 24) return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px minmax(0, 1fr)", flex: 1, minHeight: 0 }}>
      <div style={{ borderRight: "1px solid #e2e8f0", padding: 12, overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Messages</h3>
          <button onClick={() => setOpen(true)} style={{ background: "#0d9b6c", color: "#fff", border: 0, borderRadius: 8, padding: "8px 12px", fontWeight: 600 }}>+ New SMS</button>
        </div>
        {rows.map((c) => (
          <button
            key={c.contactId}
            type="button"
            onClick={() => setSelected(c)}
            style={{
              width: "100%",
              textAlign: "left",
              border: 0,
              background: selected?.contactId === c.contactId ? "#f0f9ff" : "transparent",
              padding: "10px 8px",
              borderBottom: "1px solid #eef2f7",
              cursor: "pointer",
              color: "#000",
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>{fmtAt(c.lastAt)}</div>
            </div>
            {c.lastBody && (
              <div style={{ fontSize: 12, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {c.lastBody}
              </div>
            )}
            {c.unread > 0 && (
              <div style={{ alignSelf: "flex-start", background: "#2563eb", color: "#fff", fontSize: 11, fontWeight: 700, padding: "1px 6px", borderRadius: 10, marginTop: 2 }}>
                {c.unread}
              </div>
            )}
          </button>
        ))}
        {rows.length === 0 && <div style={{ color: "#8e8e93", padding: 12 }}>No contacts in this silo yet.</div>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0, height: "100%", overflow: "hidden", background: "#fff" }}>
        {!selected && <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "#8e8e93", flex: 1 }}>Choose a contact.</div>}
        {selected && (
          <>
            <div style={{ padding: "12px 20px", borderBottom: "1px solid #f0f0f5", background: "#f5f5f7" }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#000" }}>{selected.name}</div>
              {selected.phone && <div style={{ fontSize: 12, color: "#3c3c43" }}>{selected.phone}</div>}
              {!applicationId && (
                <div style={{ fontSize: 11, color: "#b45309", marginTop: 4 }}>
                  No application on file — send an SMS via "+ New SMS" to reach this contact.
                </div>
              )}
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", minHeight: 0 }}>
              {loadingThread ? (
                <div style={{ color: "#8e8e93" }}>Loading…</div>
              ) : (
                <CommunicationsThread
                  messages={messages.map((m) => ({
                    id: m.id,
                    body: m.body,
                    authorRole: (m.senderType === "staff" || m.source === "staff") ? "self" : "other",
                    authorName: m.senderType === "staff" ? (m.senderName ?? "You") : selected.name,
                    created_at: m.createdAt ?? null,
                  }))}
                  emptyText="No messages yet — say hello."
                />
              )}
            </div>
            {applicationId && (
              <div style={{ borderTop: "1px solid #e2e8f0", padding: "10px 16px", display: "flex", gap: 8, background: "#fff" }}>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                  rows={2}
                  placeholder="Message the client…  (⌘/Ctrl+Enter to send.  Insert form links like #networth, #debt, #upload.)"
                  style={{ flex: 1, resize: "none", border: "1px solid #d1d5db", borderRadius: 8, padding: 10, fontSize: 14, color: "#000", background: "#fff" }}
                />
                <button
                  onClick={() => void send()}
                  disabled={!draft.trim() || sending}
                  style={{
                    alignSelf: "flex-end",
                    background: draft.trim() && !sending ? "#2563eb" : "#94a3b8",
                    color: "#fff",
                    border: 0,
                    borderRadius: 8,
                    padding: "10px 18px",
                    fontWeight: 600,
                    cursor: draft.trim() && !sending ? "pointer" : "not-allowed",
                  }}
                >
                  Send
                </button>
              </div>
            )}
          </>
        )}
      </div>
      {open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)", display: "grid", placeItems: "center", zIndex: 70 }}>
          <div style={{ width: "min(560px, 92vw)", background: "#fff", borderRadius: 12, padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>New SMS</h3>
            <label style={{ display: "block", marginBottom: 8 }}>Phone<textarea value={to} onChange={(e) => setTo(e.target.value)} rows={2} style={{ background: "#fff", color: "#000", border: "1px solid #d1d5db", padding: 10, borderRadius: 8, fontSize: 14, width: "100%", minHeight: 80 }} /></label>
            <label style={{ display: "block", marginBottom: 8 }}>Message<textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} style={{ background: "#fff", color: "#000", border: "1px solid #d1d5db", padding: 10, borderRadius: 8, fontSize: 14, width: "100%", minHeight: 80 }} /></label>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={async () => {
                if (!to.trim() || !body.trim()) return;
                await api.post("/api/communications/sms", { to: to.trim(), body: body.trim() });
                const c: Contact = { id: `new-${to.replace(/\D/g,"")}`, name: to.trim(), phone: to.trim() };
                onStartConversation(c);
                setOpen(false);
                setTo("");
                setBody("");
              }} style={{ background: "#0d9b6c", color: "#fff", border: 0, borderRadius: 8, padding: "8px 12px" }}>Send SMS</button>
              <SecondaryButton onClick={() => setOpen(false)}>Cancel</SecondaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Inbox tab ─────────────────────────────────────────────────────────────────
function InboxTab() {
  const [composeOpen, setComposeOpen] = useState(false);

  const [mailboxes, setMailboxes] = useState<{ mine: { address: string; display_name: string } | null; shared: { address: string; display_name: string }[] }>({ mine: null, shared: [] });
  const [active, setActive] = useState<string>("");
  const [messages, setMessages] = useState<Array<{ id: string; subject: string; bodyPreview?: string; from?: { emailAddress?: { address: string; name?: string } }; receivedDateTime?: string; isRead?: boolean }>>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [selected, setSelected] = useState<{ subject: string; from?: { emailAddress?: { address: string; name?: string } }; body?: { content: string; contentType: "html" | "text" }; receivedDateTime?: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // BF_PORTAL_BLOCK_v213_INBOX_RECONNECT_M365_v2
  const [needsReconnect, setNeedsReconnect] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  // Load mailboxes once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await withO365Refresh(() =>
          api<{ mine: { address: string; display_name: string } | null; shared: { address: string; display_name: string }[] }>("/api/crm/shared-mailboxes")
        );
        if (cancelled) return;
        setMailboxes(r);
        // Default to personal mailbox if available, else first shared
        setActive(r.mine ? "" : (r.shared[0]?.address ?? ""));
        setNeedsReconnect(false);
      } catch (e: unknown) {
        if (cancelled) return;
        const status = (e as { status?: number; response?: { status?: number } })?.status
          ?? (e as { response?: { status?: number } })?.response?.status;
        if (status === 401) {
          setNeedsReconnect(true);
          setErr(null);
        } else {
          setErr("Could not load Microsoft 365 mailboxes.");
        }
      }
    })();
    return () => { cancelled = true; };
  }, [reconnectAttempts]);

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
        const r = await withO365Refresh(() =>
          api<typeof messages>("/api/crm/inbox", { params })
        );
        if (cancelled) return;
        setMessages(Array.isArray(r) ? r : []);
        setNeedsReconnect(false);
      } catch (e: unknown) {
        if (cancelled) return;
        const status = (e as { status?: number; response?: { status?: number } })?.status
          ?? (e as { response?: { status?: number } })?.response?.status;
        if (status === 401) {
          setNeedsReconnect(true);
          setErr(null);
        } else {
          const message = e instanceof Error ? e.message : "Could not load inbox.";
          setErr(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [active, reconnectAttempts]);

  // Load body when a message is selected
  useEffect(() => {
    if (!selectedId) { setSelected(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const params = active ? { mailbox: active } : {};
        const r = await withO365Refresh(() =>
          api<typeof selected>(`/api/crm/inbox/${encodeURIComponent(selectedId)}`, { params })
        );
        if (!cancelled) setSelected(r);
      } catch {
        if (!cancelled) setSelected(null);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedId, active]);

  // BF_PORTAL_BLOCK_v213_INBOX_RECONNECT_M365_v2
  // Reconnect Microsoft 365 in place — no navigation to Settings required.
  const handleReconnect = async (): Promise<void> => {
    if (reconnecting) return;
    setReconnecting(true);
    setErr(null);
    try {
      const msal = (window as unknown as { msalInstance?: {
        getAllAccounts?: () => Array<{ homeAccountId?: string }>;
        acquireTokenSilent: (req: unknown) => Promise<{ accessToken: string; refreshToken?: string; expiresOn?: Date }>;
        acquireTokenPopup: (req: unknown) => Promise<{ accessToken: string; refreshToken?: string; expiresOn?: Date }>;
      } }).msalInstance;
      if (!msal) {
        setErr("Microsoft 365 is not configured. Reload and try again.");
        return;
      }
      const scopes = [
        "User.Read", "Mail.Send", "Mail.ReadWrite", "Mail.Send.Shared",
        "Calendars.ReadWrite", "Tasks.ReadWrite", "offline_access",
      ];
      const accounts = msal.getAllAccounts?.() ?? [];
      let result: { accessToken: string; refreshToken?: string; expiresOn?: Date };
      try {
        if (!accounts.length) throw new Error("no_account");
        result = await msal.acquireTokenSilent({ scopes, account: accounts[0] });
      } catch {
        result = await msal.acquireTokenPopup({ scopes });
      }
      if (!result?.accessToken) throw new Error("no_token");
      await api.post("/api/users/me/o365-tokens", {
        access_token: result.accessToken,
        refresh_token: result.refreshToken ?? null,
        expires_in: result.expiresOn
          ? Math.max(0, Math.floor((result.expiresOn.getTime() - Date.now()) / 1000))
          : null,
        account_id: accounts[0]?.homeAccountId ?? null,
      });
      setNeedsReconnect(false);
      setReconnectAttempts((n) => n + 1);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Reconnect failed.";
      setErr(`Reconnect failed: ${message}. Open Settings → My Profile to reconnect manually.`);
    } finally {
      setReconnecting(false);
    }
  };

  const mailboxOptions: Array<{ value: string; label: string }> = [];
  if (mailboxes.mine) mailboxOptions.push({ value: "", label: `${mailboxes.mine.display_name} (mine)` });
  for (const m of mailboxes.shared) mailboxOptions.push({ value: m.address, label: m.display_name });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 0, height: "100%", background: "#fff", color: "#000", position: "relative" }}>
      {/* BF_PORTAL_BLOCK_v213_INBOX_RECONNECT_M365_v2 — reconnect banner */}
      {needsReconnect && (
        <div style={{
          gridColumn: "1 / -1",
          padding: "12px 16px",
          background: "#fef3c7",
          borderBottom: "1px solid #fde68a",
          color: "#78350f",
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontSize: 14,
        }}>
          <span style={{ flex: 1 }}>
            Microsoft 365 connection has expired. Reconnect to view your inbox.
          </span>
          <button
            type="button"
            onClick={() => void handleReconnect()}
            disabled={reconnecting}
            style={{
              padding: "8px 14px",
              border: "none",
              borderRadius: 4,
              background: reconnecting ? "#a78bfa" : "#0066cc",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: reconnecting ? "default" : "pointer",
            }}
          >
            {reconnecting ? "Reconnecting…" : "Reconnect Microsoft 365"}
          </button>
        </div>
      )}
      <div style={{ borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column" }}>
        {/* BF_PORTAL_BLOCK_77_INBOX_COMPOSE_v1 - Compose button + modal. */}
        <div style={{ padding: 12, borderBottom: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            type="button"
            onClick={() => setComposeOpen(true)}
            style={{ width: "100%", padding: "8px 12px", border: "none", borderRadius: 4, background: "#0066cc", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
          >
            + Compose
          </button>
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
      <O365ComposeModal
        open={composeOpen}
        fromOptions={mailboxOptions}
        defaultFrom={active}
        onClose={() => setComposeOpen(false)}
      />
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
  const [forcedSmsContact, setForcedSmsContact] = useState<Contact | null>(null);

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
        {tab === "sms" && <SmsTab forcedContact={forcedSmsContact} onContactSelected={setForcedSmsContact} />}
        {tab === "messages" && <MessagesTab onStartConversation={(contact) => { setForcedSmsContact(contact); setTab("sms"); }} />}
        {tab === "inbox" && <InboxTab />}
        {tab === "issues" && <IssuesTab />}
      </div>
    </div>
  );
}
