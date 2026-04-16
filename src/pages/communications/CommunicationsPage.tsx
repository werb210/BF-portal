import { FormEvent, useEffect, useMemo, useState } from "react";
import RequireRole from "@/components/auth/RequireRole";
import Card from "@/components/ui/Card";
import { api } from "@/api";
import type { MessageRecord } from "@/types/messages.types";

type CommsTab = "messages" | "sms" | "email" | "issues" | "contact-forms";

const COMMS_TABS: { id: CommsTab; label: string }[] = [
  { id: "messages", label: "Messages" },
  { id: "sms", label: "SMS" },
  { id: "email", label: "Email" },
  { id: "issues", label: "Issue Reports" },
  { id: "contact-forms", label: "Contact Forms" }
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
      const thread = await api<MessageRecord[]>(`/api/messages?contactId=${encodeURIComponent(activeContactId)}`);
      setMessages(thread);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (!activeContactId) return;

    const fetchMessages = () => {
      api<MessageRecord[]>(`/api/messages?contactId=${encodeURIComponent(activeContactId)}`)
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
              <p className="text-sm text-slate-500">Enter a contact ID to load its thread.</p>
              <input
                className="w-full p-2 rounded border"
                placeholder="Contact ID"
                value={activeContactId}
                onChange={(event) => setActiveContactId(event.target.value.trim())}
              />
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
          <div className="drawer-section">
            <div className="drawer-section__title">Twilio SMS</div>
            <p>Compose SMS and view per-contact history.</p>
            <textarea className="w-full mt-3 p-2 rounded border" placeholder="Write SMS message" />
          </div>
        )}

        {tab === "email" && (
          <div className="drawer-section space-y-3">
            <div className="drawer-section__title">Email Composer</div>
            <select className="w-full p-2 rounded border">
              <option>Personal inbox: todd@boreal.financial</option>
              <option>Shared: deals@boreal.financial</option>
            </select>
            <input className="w-full p-2 rounded border" placeholder="To" />
            <input className="w-full p-2 rounded border" placeholder="Subject" />
            <textarea className="w-full p-2 rounded border min-h-[120px]" placeholder="Body (rich text)" />
            <p className="text-sm text-slate-500">Sent and received history appears below this composer.</p>
          </div>
        )}

        {tab === "issues" && (
          <div className="drawer-section">
            <div className="drawer-section__title">Issue Reports</div>
            <p>Client issue reports with screenshot, date, status and "Mark as resolved" actions appear here.</p>
          </div>
        )}

        {tab === "contact-forms" && (
          <div className="drawer-section">
            <div className="drawer-section__title">Contact Forms</div>
            <p>Submissions from BF website contact form appear in this tab.</p>
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
