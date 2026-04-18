import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/api";

type Contact = { id: string; name: string; phone: string | null };
type Message = {
  id: string;
  direction: "inbound" | "outbound";
  body: string;
  created_at: string;
  staff_name: string | null;
};

export default function CommunicationsPage() {
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
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [selected, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
    } catch {
      // surface error via toast in future
    } finally {
      setSending(false);
    }
  }

  const filtered = contacts.filter(
    (c) => c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search),
  );

  return (
    <div style={{ display: "flex", height: "calc(100vh - 80px)", gap: 0 }}>
      <div
        style={{
          width: 280,
          borderRight: "1px solid #e2e8f0",
          display: "flex",
          flexDirection: "column",
          background: "#fff",
        }}
      >
        <div style={{ padding: 12, borderBottom: "1px solid #e2e8f0" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 8px", color: "#0f172a" }}>Communications</h2>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts…"
            style={{
              width: "100%",
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              fontSize: 13,
              boxSizing: "border-box",
            }}
          />
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {filtered.map((c) => (
            <div
              key={c.id}
              onClick={() => {
                setSelected(c);
                setMessages([]);
              }}
              style={{
                padding: "10px 14px",
                cursor: "pointer",
                borderBottom: "1px solid #f1f5f9",
                background: selected?.id === c.id ? "#eff6ff" : "transparent",
                borderLeft: selected?.id === c.id ? "3px solid #3b82f6" : "3px solid transparent",
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 13, color: "#1e293b" }}>{c.name}</div>
              {c.phone && <div style={{ fontSize: 11, color: "#94a3b8" }}>{c.phone}</div>}
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: 20, textAlign: "center", fontSize: 13, color: "#94a3b8" }}>No contacts found</div>
          )}
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#f8fafc" }}>
        {!selected ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#94a3b8",
              fontSize: 14,
            }}
          >
            Select a contact to view messages
          </div>
        ) : (
          <>
            <div
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid #e2e8f0",
                background: "#fff",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>{selected.name}</div>
                {selected.phone && <div style={{ fontSize: 12, color: "#94a3b8" }}>{selected.phone}</div>}
              </div>
            </div>
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {messages.length === 0 && (
                <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, marginTop: 40 }}>No messages yet</div>
              )}
              {messages.map((m) => (
                <div
                  key={m.id}
                  style={{
                    alignSelf: m.direction === "outbound" ? "flex-end" : "flex-start",
                    maxWidth: "70%",
                  }}
                >
                  <div
                    style={{
                      background: m.direction === "outbound" ? "#2563eb" : "#fff",
                      color: m.direction === "outbound" ? "#fff" : "#1e293b",
                      borderRadius: m.direction === "outbound" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                      padding: "10px 14px",
                      fontSize: 14,
                      lineHeight: 1.5,
                      boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                    }}
                  >
                    {m.body}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "#94a3b8",
                      marginTop: 3,
                      textAlign: m.direction === "outbound" ? "right" : "left",
                    }}
                  >
                    {m.direction === "outbound" && m.staff_name ? `${m.staff_name} · ` : ""}
                    {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <div
              style={{
                padding: 12,
                borderTop: "1px solid #e2e8f0",
                background: "#fff",
                display: "flex",
                gap: 8,
              }}
            >
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                placeholder="Type a message…"
                rows={2}
                style={{
                  flex: 1,
                  resize: "none",
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  padding: "8px 12px",
                  fontSize: 14,
                  outline: "none",
                }}
              />
              <button
                onClick={() => void send()}
                disabled={!draft.trim() || !selected.phone || sending}
                style={{
                  padding: "0 18px",
                  background: "#2563eb",
                  border: "none",
                  borderRadius: 10,
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                  opacity: !draft.trim() || sending ? 0.5 : 1,
                }}
              >
                {sending ? "…" : "Send"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
