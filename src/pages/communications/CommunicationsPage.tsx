import { FormEvent, useEffect, useMemo, useState } from "react";
import RequireRole from "@/components/auth/RequireRole";
import Card from "@/components/ui/Card";
import { api } from "@/api";
import type { MessageRecord } from "@/types/messages.types";
import ApplicationContactPicker from "@/components/communications/ApplicationContactPicker";

type CommsTab = "messages" | "sms" | "email" | "issues";

const COMMS_TABS: { id: CommsTab; label: string }[] = [
  { id: "messages", label: "Messages" },
  { id: "sms", label: "SMS" },
  { id: "email", label: "Email" },
  { id: "issues", label: "Issue Reports" }
];

const CommunicationsContent = () => {
  const [tab, setTab] = useState<CommsTab>("messages");
  const [activeContactId, setActiveContactId] = useState("");
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);

  const refetchMessages = async () => {
    if (!activeContactId) {
      setMessages([]);
      return;
    }

    try {
      const thread = await api<MessageRecord[]>(`/api/messages?contactId=${encodeURIComponent(activeContactId)}&applicationId=${encodeURIComponent(activeContactId)}`);
      setMessages(thread);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (!activeContactId) return;

    const fetchMessages = () => {
      api<MessageRecord[]>(`/api/messages?contactId=${encodeURIComponent(activeContactId)}&applicationId=${encodeURIComponent(activeContactId)}`)
        .then(setMessages)
        .catch(console.error);
    };

    fetchMessages();
    const interval = window.setInterval(fetchMessages, 5000);
    return () => window.clearInterval(interval);
  }, [activeContactId]);

  const handleSendMessage = async (event: FormEvent) => {
    event.preventDefault();
    const text = messageText.trim();
    if (!activeContactId || !text) return;

    setIsSending(true);
    try {
      await api("/api/messages", {
        method: "POST",
        body: { contactId: activeContactId, text, direction: "outbound" }
      });
      setMessageText("");
      await refetchMessages();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSending(false);
    }
  };

  const sortedMessages = useMemo(
    () =>
      [...messages].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      ),
    [messages]
  );

  return (
    <div className="page space-y-4">
      <Card title="Communications">
        <div className="communications-tabs">
          {COMMS_TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`ui-button ${tab === item.id ? "ui-button--primary" : "ui-button--secondary"}`}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === "messages" && (
          <div className="communications-shell">
            <aside className="communications-shell__list">
              <div className="drawer-section__title">Conversations</div>
              <p className="text-sm text-slate-500">Search by application/contact to load client ↔ staff history.</p>
              <ApplicationContactPicker onSelect={(contactId) => setActiveContactId(contactId)} />
            </aside>
            <section className="communications-shell__thread">
              <div className="drawer-section__title">Thread</div>
              <div className="communications-thread-list">
                {sortedMessages.length ? (
                  sortedMessages.map((message) => (
                    <div key={message.id} className="communications-message">
                      <div className="font-semibold text-slate-700">{message.senderName ?? message.senderType ?? "Unknown"}</div>
                      <div>{message.body}</div>
                      <div className="text-xs text-slate-500 mt-1">{new Date(message.createdAt).toLocaleString()}</div>
                    </div>
                  ))
                ) : (
                  <div className="ui-empty-state ui-empty-state--compact">
                    <div className="ui-empty-state__icon" aria-hidden="true">💬</div>
                    <p>No messages loaded.</p>
                    <button type="button" className="ui-button ui-button--secondary">Select a Conversation</button>
                  </div>
                )}
              </div>
              <form onSubmit={handleSendMessage} className="communications-input-wrap">
                <textarea
                  className="communications-input"
                  placeholder="Message with #upload #networth #equipment #realestate #other"
                  value={messageText}
                  onChange={(event) => setMessageText(event.target.value)}
                />
                <button type="submit" className="ui-button ui-button--primary" disabled={isSending || !activeContactId.trim()}>
                  {isSending ? "Sending..." : "Send Message"}
                </button>
              </form>
            </section>
          </div>
        )}

        {tab === "sms" && (
          <div style={{ padding: 16 }}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 13, color: "#94a3b8", display: "block", marginBottom: 4 }}>
                To (E.164 phone number)
              </label>
              <input
                type="tel"
                placeholder="+15550000000"
                style={{
                  width: "100%", padding: "8px 12px", borderRadius: 8,
                  border: "1px solid #334155", background: "#1e293b",
                  color: "#f1f5f9", fontSize: 14, boxSizing: "border-box"
                }}
                id="sms-to"
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 13, color: "#94a3b8", display: "block", marginBottom: 4 }}>
                Message
              </label>
              <textarea
                rows={4}
                placeholder="Type your SMS message..."
                style={{
                  width: "100%", padding: "8px 12px", borderRadius: 8,
                  border: "1px solid #334155", background: "#1e293b",
                  color: "#f1f5f9", fontSize: 14, resize: "vertical", boxSizing: "border-box"
                }}
                id="sms-body"
              />
            </div>
            <button
              onClick={async () => {
                const to = (document.getElementById("sms-to") as HTMLInputElement)?.value;
                const body = (document.getElementById("sms-body") as HTMLTextAreaElement)?.value;
                if (!to || !body) return;
                try {
                  await api("/api/communications/sms", { method: "POST", body: { to, body } });
                  alert("SMS sent");
                } catch {
                  alert("Failed to send SMS");
                }
              }}
              style={{
                background: "#3b82f6", color: "#fff", border: "none",
                borderRadius: 8, padding: "8px 20px", cursor: "pointer", fontSize: 14
              }}
            >
              Send SMS
            </button>
          </div>
        )}

        {tab === "email" && (
          <div className="ui-empty-state">
            <div className="ui-empty-state__icon">📧</div>
            <h3>Email via Microsoft 365</h3>
            <p>Connect your Microsoft 365 account in Settings → Connected Accounts to enable email here.</p>
            <button type="button" className="ui-button ui-button--secondary">Open Connected Accounts</button>
          </div>
        )}

        {tab === "issues" && (
          <div className="ui-empty-state">
            <div className="ui-empty-state__icon">🛠️</div>
            <h3>Issue Reports</h3>
            <p>Client issue reports with screenshot, date, and status appear here.</p>
            <button type="button" className="ui-button ui-button--secondary">View Issue Queue</button>
          </div>
        )}
      </Card>
    </div>
  );
};

const CommunicationsPage = () => (
  <RequireRole roles={["Admin", "Staff"]}>
    <CommunicationsContent />
  </RequireRole>
);

export default CommunicationsPage;
