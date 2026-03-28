import { useEffect, useMemo, useRef, useState } from "react";
import { closeSession, getMessages, sendStaffMessage } from "../api";
import { attachTranscriptToLead } from "@/api/communications";
import type { ChatMessage as ChatMessageType, ChatSession } from "../types";
import ChatMessage from "./ChatMessage";
import ChatQueue from "./ChatQueue";

const ChatWindow = () => {
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [draft, setDraft] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);
  const streamRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!selectedSession) return;

    let mounted = true;
    const loadMessages = async () => {
      const data = await getMessages(selectedSession.id);
      if (mounted) {
        setMessages(data);
      }
    };

    void loadMessages();
    const interval = window.setInterval(() => {
      void loadMessages();
    }, 5_000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [selectedSession]);

  useEffect(() => {
    streamRef.current?.scrollTo({ top: streamRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const isClosed = selectedSession?.status === "closed";

  const statusBadge = useMemo(() => {
    if (!selectedSession) return null;
    if (selectedSession.status === "human") {
      return <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">● Live</span>;
    }

    return <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">Closed</span>;
  }, [selectedSession]);

  const handleSend = async () => {
    if (!selectedSession || !draft.trim() || isClosed) return;
    const sent = await sendStaffMessage(selectedSession.id, draft.trim());
    setMessages((prev) => [...prev, sent]);
    setDraft("");
  };

  const handleCloseSession = async () => {
    if (!selectedSession || isClosed) return;
    await closeSession(selectedSession.id);
    const transcript = messages.map((message) => `${message.role}: ${message.message}`).join("\n");
    await attachTranscriptToLead(selectedSession.id, transcript);
    const updatedSession = { ...selectedSession, status: "closed" as const };
    setSelectedSession(updatedSession);
    setRefreshToken((prev) => prev + 1);
    if (updatedSession.lead_id) {
      window.dispatchEvent(
        new CustomEvent("crm:lead-refresh", {
          detail: {
            leadId: updatedSession.lead_id,
            events: ["Chat Session Started", "Staff Handoff", "Chat Session Closed", "Transcript Attached"]
          }
        })
      );
    }
  };

  return (
    <div className="grid h-[78vh] grid-cols-12 gap-4">
      <aside className="col-span-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">Human chat queue</h2>
        <ChatQueue
          onSelectSession={setSelectedSession}
          selectedSessionId={selectedSession?.id}
          refreshToken={refreshToken}
        />
      </aside>

      <section className="col-span-8 flex flex-col rounded-xl border border-slate-200 bg-white">
        {selectedSession ? (
          <>
            <header className="flex items-center justify-between border-b border-slate-200 p-4">
              <div>
                <p className="font-semibold text-slate-900">Session {selectedSession.id}</p>
                <p className="text-xs text-slate-500">{selectedSession.source}</p>
                {selectedSession.channel === "voice" && (
                  <p className="mt-1 text-xs font-medium text-violet-600">Voice session coming in V2</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {statusBadge}
                <button
                  type="button"
                  onClick={handleCloseSession}
                  disabled={isClosed}
                  className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Close session
                </button>
              </div>
            </header>

            <div ref={streamRef} className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === "staff" ? "justify-end" : "justify-start"}`}>
                  <ChatMessage message={message} />
                </div>
              ))}
            </div>

            <footer className="border-t border-slate-200 p-4">
              <div className="flex gap-2">
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void handleSend();
                    }
                  }}
                  disabled={isClosed}
                  placeholder={isClosed ? "Session closed" : "Type a message"}
                  className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                />
                <button
                  type="button"
                  onClick={() => {
                    void handleSend();
                  }}
                  disabled={isClosed || !draft.trim()}
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </footer>
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">Select a session to view live messages.</div>
        )}
      </section>
    </div>
  );
};

export default ChatWindow;
