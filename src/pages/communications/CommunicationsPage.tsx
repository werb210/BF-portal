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
        <div className="flex flex-wrap gap-2 mb-4">
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="drawer-section space-y-3">
              <div className="drawer-section__title">Conversations</div>
              <p className="text-sm text-slate-500">Messages loads the client↔staff thread from <code>/api/messages?contactId=…</code> (communications_messages), and staff can search by application/contact.</p>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: "#94a3b8", display: "block", marginBottom: 4 }}>
                  Search by application or contact
                </label>
                <ApplicationContactPicker onSelect={(contactId) => setActiveContactId(contactId)} />
              </div>
            </div>
            <div className="drawer-section md:col-span-2 space-y-3">
              <div className="drawer-section__title">Thread</div>
              <div className="max-h-[320px] overflow-y-auto rounded border bg-slate-50 p-3 space-y-2">
                {sortedMessages.length ? (
                  sortedMessages.map((message) => (
                    <div key={message.id} className="rounded border bg-white px-3 py-2 text-sm">
                      <div className="font-semibold text-slate-700">{message.senderName ?? message.senderType ?? "Unknown"}</div>
                      <div>{message.body}</div>
                      <div className="text-xs text-slate-500 mt-1">{new Date(message.createdAt).toLocaleString()}</div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No messages loaded.</p>
                )}
              </div>
              <form onSubmit={handleSendMessage} className="space-y-2">
                <textarea
                  className="w-full p-2 rounded border"
                  placeholder="Message with #upload #networth #equipment #realestate #other"
                  value={messageText}
                  onChange={(event) => setMessageText(event.target.value)}
                />
                <button type="submit" className="ui-button ui-button--primary" disabled={isSending || !activeContactId.trim()}>
                  {isSending ? "Sending..." : "Send Message"}
                </button>
              </form>
            </div>
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
          <div style={{ padding: 24, color: "#64748b", textAlign: "center" }}>
            <div style={{ fontSize: 18, marginBottom: 8 }}>📧 Email via Microsoft 365</div>
            <div style={{ fontSize: 14 }}>
              O365 inbox integration is configured separately. Connect your Microsoft 365 account
              in Settings → Connected Accounts to enable email here.
            </div>
          </div>
        )}

        {tab === "issues" && (
          <div className="drawer-section">
            <div className="drawer-section__title">Issue Reports</div>
            <p>Client issue reports with screenshot, date, status and "Mark as resolved" actions appear here.</p>
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
