import { useEffect, useMemo, useRef, useState } from "react";
import {
  applyHumanActiveState,
  archiveIssue,
  closeEscalatedChat,
  deleteIssue,
  fetchCommunicationThreads,
  fetchConversationById,
  fetchCrmLeads,
  sendCommunication
} from "@/api/communications";
import { connectAiSocket, subscribeAiSocket, subscribeAiSocketConnection } from "@/services/aiSocket";
import { getStoredAccessToken } from "@/services/token";
import { useAuth } from "@/hooks/useAuth";
import type { CommunicationConversation, CommunicationMessage, CrmLead } from "@/api/communications";

type ConnectionState = "connecting" | "connected" | "disconnected";

type SessionSocketState = "idle" | "connecting" | "connected" | "reconnecting" | "disconnected";

const conversationLabel = (conversation: CommunicationConversation) => {
  if (conversation.status === "closed") return "Closed";
  if (conversation.status === "human" || conversation.metadata?.aiPaused) return "Human Mode";
  return "AI Mode";
};

const readinessBadge = (conversation: CommunicationConversation) => {
  const progression = String(conversation.metadata?.progression ?? "").toLowerCase();
  if (progression === "application_submitted") return "Application Submitted";
  if (progression === "application_started") return "Application Started";
  return "Readiness Only";
};

const readinessStatus = (conversation: CommunicationConversation) => {
  if (conversation.status === "closed") return "closed";
  const progression = String(conversation.metadata?.progression ?? "").toLowerCase();
  if (progression === "application_submitted") return "converted";
  return "open";
};

const dedupeLeads = (items: CrmLead[]) => {
  const byKey = new Map<string, CrmLead>();
  items.forEach((lead) => {
    const email = String(lead.email ?? "").trim().toLowerCase();
    const phone = String(lead.phone ?? "").trim().toLowerCase();
    const key = email || phone || lead.id;
    if (!byKey.has(key)) {
      byKey.set(key, lead);
      return;
    }
    const existing = byKey.get(key);
    if (!existing) return;
    byKey.set(key, {
      ...existing,
      tags: [...new Set([...(existing.tags ?? []), ...(lead.tags ?? [])])],
      conversationIds: [...new Set([...(existing.conversationIds ?? []), ...(lead.conversationIds ?? [])])],
      transcriptIds: [...new Set([...(existing.transcriptIds ?? []), ...(lead.transcriptIds ?? [])])]
    });
  });
  return [...byKey.values()];
};

const MAX_SESSION_SOCKET_RECONNECT_ATTEMPTS = 6;
const ACTIVE_SESSION_ROW_HEIGHT = 88;
const ACTIVE_SESSION_LIST_HEIGHT = 380;

export default function ChatSessionsPanel() {
  const [sessions, setSessions] = useState<CommunicationConversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<CommunicationMessage[]>([]);
  const [input, setInput] = useState("");
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [sessionSocketState, setSessionSocketState] = useState<SessionSocketState>("idle");
  const [staffConnected, setStaffConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [activeScrollTop, setActiveScrollTop] = useState(0);
  const { user } = useAuth();
  const canModerateChat = ["admin", "staff"].includes(String(user?.role ?? "").toLowerCase());

  const sessionSocketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectAttemptRef = useRef(0);

  const selected = useMemo(
    () => (selectedId ? sessions.find((session) => session.id === selectedId) ?? null : null),
    [selectedId, sessions]
  );

  const selectedLead = useMemo(() => {
    if (!selected?.leadId) return null;
    return leads.find((lead) => lead.id === selected.leadId) ?? null;
  }, [leads, selected?.leadId]);

  const issueReports = useMemo(() => sessions.filter((session) => session.type === "issue"), [sessions]);

  const activeEscalations = useMemo(
    () =>
      sessions.filter(
        (session) => (session.type === "human" || session.type === "chat" || session.type === "credit_readiness") && session.status !== "closed"
      ),
    [sessions]
  );

  const closedEscalations = useMemo(
    () =>
      sessions.filter(
        (session) => (session.type === "human" || session.type === "chat" || session.type === "credit_readiness") && session.status === "closed"
      ),
    [sessions]
  );

  const dedupeSessions = (items: CommunicationConversation[]) => {
    const byId = new Map<string, CommunicationConversation>();
    items.forEach((item) => {
      const key = item.sessionId || item.readinessToken || item.id;
      byId.set(key, item);
    });
    return [...byId.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  };

  const loadSessions = async () => {
    try {
      const [sessionData, leadData] = await Promise.all([fetchCommunicationThreads(), fetchCrmLeads()]);
      setSessions(dedupeSessions(sessionData));
      setLeads(dedupeLeads(leadData));
      setError(null);
    } catch {
      setError("Unable to refresh sessions.");
    }
  };

  const cleanupSessionSocket = () => {
    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (sessionSocketRef.current) {
      sessionSocketRef.current.close();
      sessionSocketRef.current = null;
    }
    reconnectAttemptRef.current = 0;
    setSessionSocketState("disconnected");
    setStaffConnected(false);
  };

  const connectSessionSocket = (sessionId: string) => {
    if (!sessionId.trim()) {
      setError("Unable to connect: missing session id.");
      return;
    }
    cleanupSessionSocket();
    setSessionSocketState("connecting");
    const token = getStoredAccessToken();

    const openSocket = () => {
      const url = new URL(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws/chat`);
      url.searchParams.set("sessionId", sessionId);
      if (token) url.searchParams.set("token", token);
      const ws = new WebSocket(url.toString());
      sessionSocketRef.current = ws;

      ws.addEventListener("open", () => {
        reconnectAttemptRef.current = 0;
        ws.send(JSON.stringify({ type: "staff_joined", sessionId }));
        setSessionSocketState("connected");
        setStaffConnected(true);
      });

      ws.addEventListener("message", (event) => {
        try {
          const payload = JSON.parse(String(event.data)) as { message?: string; body?: string };
          const text = payload.message ?? payload.body;
          if (!text) return;
          setMessages((current) => [
            ...current,
            {
              id: `live-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
              conversationId: selectedId ?? sessionId,
              direction: "in",
              message: text,
              createdAt: new Date().toISOString(),
              type: "chat",
              silo: selected?.silo ?? "BF"
            }
          ]);
        } catch {
          // ignore non-json socket payloads
        }
      });

      ws.addEventListener("close", (event) => {
        sessionSocketRef.current = null;
        if (!selectedId) {
          setSessionSocketState("disconnected");
          return;
        }
        if (event.wasClean) {
          setSessionSocketState("disconnected");
          setStaffConnected(false);
          setError("Client disconnected. Waiting for reconnection…");
          return;
        }
        reconnectAttemptRef.current += 1;
        if (reconnectAttemptRef.current > MAX_SESSION_SOCKET_RECONNECT_ATTEMPTS) {
          setSessionSocketState("disconnected");
          setError("Live chat disconnected after retry attempts.");
          return;
        }
        const delay = Math.min(500 * 2 ** reconnectAttemptRef.current, 10_000);
        setSessionSocketState("reconnecting");
        reconnectTimerRef.current = window.setTimeout(() => {
          reconnectTimerRef.current = null;
          openSocket();
        }, delay);
      });

      ws.addEventListener("error", () => ws.close());
    };

    openSocket();
  };

  useEffect(() => {
    void loadSessions();

    const disconnect = connectAiSocket();
    const unsubscribeConnection = subscribeAiSocketConnection((state) => setConnectionState(state));
    const unsubscribeEscalated = subscribeAiSocket("escalated_chat", () => {
      void loadSessions();
    });
    const unsubscribeIssue = subscribeAiSocket("new_issue_report", () => {
      void loadSessions();
    });
    const unsubscribeHumanActive = subscribeAiSocket("HUMAN_ACTIVE", (payload) => {
      if (payload.sessionId) {
        void applyHumanActiveState(payload.sessionId).then(loadSessions);
      } else {
        void loadSessions();
      }
    });

    return () => {
      unsubscribeConnection();
      unsubscribeEscalated();
      unsubscribeIssue();
      unsubscribeHumanActive();
      disconnectAiSocketSafe(disconnect);
      cleanupSessionSocket();
      setConnectionState("disconnected");
    };
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      cleanupSessionSocket();
      return;
    }

    void fetchConversationById(selectedId)
      .then((conversation) => {
        setMessages(conversation.messages);
      })
      .catch(() => {
        setError("Unable to load selected session.");
      });
  }, [selectedId, sessions]);

  async function openSession(conversation: CommunicationConversation) {
    try {
      setSelectedId(conversation.id);
      const updated = await fetchConversationById(conversation.id);
      setMessages(updated.messages);
      if (conversation.sessionId) {
        connectSessionSocket(conversation.sessionId);
      }
      if (conversation.status !== "human") {
        await applyHumanActiveState(conversation.id);
        await loadSessions();
      }
    } catch {
      setError("Unable to open the selected session.");
    }
  }

  async function transferToStaff(conversation: CommunicationConversation) {
    if (!canModerateChat) return;
    try {
      await applyHumanActiveState(conversation.id);
      await sendCommunication(conversation.id, "Transferring you to a staff member…", "system");
      await loadSessions();
    } catch {
      setError("Unable to transfer this session.");
    }
  }

  async function send() {
    if (!canModerateChat) return;
    if (!selected || !input.trim()) return;
    try {
      await sendCommunication(selected.id, input, selected.type);
      setInput("");
      await loadSessions();
    } catch {
      setError("Unable to send message.");
    }
  }

  async function closeSession() {
    if (!canModerateChat) return;
    if (!selected) return;
    try {
      const transcript = messages.map((message) => `${message.direction}: ${message.message}`).join("\n");
      await closeEscalatedChat(selected.id, transcript);
      if (sessionSocketRef.current && selected.sessionId) {
        sessionSocketRef.current.send(JSON.stringify({ type: "close_session", sessionId: selected.sessionId, transcript }));
      }
      await loadSessions();
      setSelectedId(null);
      cleanupSessionSocket();
    } catch {
      setError("Unable to close the session.");
    }
  }

  async function markIssueResolved(conversationId: string) {
    if (!canModerateChat) return;
    try {
      await closeEscalatedChat(conversationId, "Issue resolved by staff.");
      await loadSessions();
    } catch {
      setError("Unable to mark issue resolved.");
    }
  }

  async function archiveIssueReport(conversationId: string) {
    if (!canModerateChat) return;
    try {
      await archiveIssue(conversationId);
      await loadSessions();
    } catch {
      setError("Unable to archive issue.");
    }
  }

  async function removeIssue(conversationId: string) {
    if (!canModerateChat) return;
    try {
      await deleteIssue(conversationId);
      await loadSessions();
    } catch {
      setError("Unable to delete issue.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded border p-4">
        <h3 className="mb-2 font-semibold">AI Escalations</h3>

        <div className="mb-2 text-sm text-slate-600">Connection: {connectionState}</div>
        <div className="mb-2 text-sm text-slate-600">Chat socket: {sessionSocketState === "reconnecting" ? "Reconnecting…" : sessionSocketState}</div>
        <div className="mb-2 text-sm text-slate-600">Active sessions: {activeEscalations.length}</div>
        {error ? <div className="mb-2 text-sm text-rose-700">{error}</div> : null}

        <div className="flex gap-4">
          <div className="w-1/3 border-r pr-2">
            <div className="mb-2 text-xs font-semibold uppercase text-slate-500">Active</div>
            <div
              className="overflow-auto"
              style={{ maxHeight: ACTIVE_SESSION_LIST_HEIGHT }}
              onScroll={(event) => setActiveScrollTop(event.currentTarget.scrollTop)}
            >
              {activeEscalations.length > 50 ? (
                <div style={{ height: activeEscalations.length * ACTIVE_SESSION_ROW_HEIGHT, position: "relative" }}>
                  {activeEscalations
                    .slice(
                      Math.max(0, Math.floor(activeScrollTop / ACTIVE_SESSION_ROW_HEIGHT) - 5),
                      Math.ceil((activeScrollTop + ACTIVE_SESSION_LIST_HEIGHT) / ACTIVE_SESSION_ROW_HEIGHT) + 5
                    )
                    .map((session, index) => {
                      const start = Math.max(0, Math.floor(activeScrollTop / ACTIVE_SESSION_ROW_HEIGHT) - 5);
                      const rowIndex = start + index;
                      return (
                        <div
                          key={session.id}
                          className="absolute cursor-pointer p-2 hover:bg-gray-100"
                          style={{ left: 0, right: 0, top: rowIndex * ACTIVE_SESSION_ROW_HEIGHT }}
                          onClick={() => void openSession(session)}
                        >
                          <div>Session {session.sessionId ?? session.id}</div>
                          <div className="text-xs text-slate-500">Lead: {session.contactName ?? "Unknown"}</div>
                          <div className="text-xs text-slate-500">Last message: {new Date(session.updatedAt).toLocaleString()}</div>
                          <div className="text-xs text-slate-500">Status: {conversationLabel(session)}</div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                activeEscalations.map((session) => (
                  <div key={session.id} className="cursor-pointer p-2 hover:bg-gray-100" onClick={() => void openSession(session)}>
                    <div>Session {session.sessionId ?? session.id}</div>
                    <div className="text-xs text-slate-500">Lead: {session.contactName ?? "Unknown"}</div>
                    <div className="text-xs text-slate-500">Last message: {new Date(session.updatedAt).toLocaleString()}</div>
                    <div className="text-xs text-slate-500">Status: {conversationLabel(session)}</div>
                  </div>
                ))
              )}
            </div>
            {!activeEscalations.length && <div className="text-xs text-slate-500">No active sessions.</div>}
            <div className="mb-2 mt-4 text-xs font-semibold uppercase text-slate-500">Closed</div>
            {closedEscalations.map((session) => (
              <div key={session.id} className="p-2">
                <div>Session {session.sessionId ?? session.id}</div>
                <div className="text-xs text-slate-500">Lead: {session.contactName ?? "Unknown"}</div>
                <div className="text-xs text-slate-500">Closed at: {session.closedAt ? new Date(session.closedAt).toLocaleString() : "-"}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-1 flex-col gap-3">
            <div className="mb-2 text-xs text-slate-500">Mode: {selected ? conversationLabel(selected) : "N/A"}</div>
            {staffConnected ? <div className="text-xs font-semibold text-emerald-700">Staff Connected</div> : null}
            {selected?.type === "credit_readiness" ? (
              <div className="mb-2 inline-block rounded border border-slate-300 px-2 py-1 text-xs text-slate-600">
                {readinessBadge(selected)} · {readinessStatus(selected)}
              </div>
            ) : null}
            {selected?.metadata?.continueApplication ? (
              <div className="mb-2 rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs text-emerald-700">
                Continuation detected: user resumed application.
              </div>
            ) : null}
            <div className="flex-1 overflow-auto border p-2 text-sm">
              {messages.map((message, index) => (
                <div key={`${message.id}-${index}`} className="mb-1">
                  <strong>{message.direction}:</strong> {message.message}
                </div>
              ))}
            </div>

            {selectedLead ? (
              <div className="rounded border p-3 text-xs text-slate-700">
                <div className="mb-2 font-semibold">CRM Lead Panel</div>
                <div>Company Name: {selectedLead.company ?? "-"}</div>
                <div>Full Name: {selectedLead.fullName ?? selectedLead.contact ?? selectedLead.name}</div>
                <div>Email: {selectedLead.email ?? selected?.contactEmail ?? "-"}</div>
                <div>Phone: {selectedLead.phone ?? selected?.contactPhone ?? "-"}</div>
                <div>Industry: {selectedLead.industry ?? "-"}</div>
                <div>YIB: {selectedLead.yib ?? "-"}</div>
                <div>Revenue: {selectedLead.revenue ?? "-"}</div>
                <div>A/R: {selectedLead.ar ?? "-"}</div>
                <div>Available Collateral: {selectedLead.availableCollateral ?? "-"}</div>
                <div>Status: {selectedLead.status ?? "-"}</div>
                <div>Tags: {selectedLead.tags.join(", ") || "-"}</div>
                <div className="mt-2 font-semibold">Readiness</div>
                <div>Score: {selectedLead.readinessScore ?? "-"}</div>
                <div>Answers: {selectedLead.readinessAnswers ? JSON.stringify(selectedLead.readinessAnswers) : "-"}</div>
                <div>Timestamp: {selectedLead.readinessCapturedAt ?? "-"}</div>
                <div>Continue Application: {selectedLead.continueApplication ? "Yes" : "No"}</div>
              </div>
            ) : null}

            {selected && (
              <div className="mt-2 flex gap-2">
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  className="flex-1 border p-2"
                  placeholder="Reply to client..."
                />
                <button onClick={() => void send()} className="rounded bg-blue-600 px-4 text-white">
                  Send
                </button>
                <button disabled={!canModerateChat} onClick={() => void transferToStaff(selected)} className="rounded bg-amber-600 px-4 text-white disabled:opacity-50">
                  Transfer
                </button>
                <button disabled={!canModerateChat} onClick={() => void closeSession()} className="rounded bg-slate-700 px-4 text-white disabled:opacity-50">
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded border p-4">
        <h3 className="mb-2 font-semibold">Issue reports</h3>
        <div className="space-y-2 text-sm">
          {issueReports.map((issue) => (
            <div key={issue.id} className="rounded border p-2">
              <div>{issue.messages[0]?.message}</div>
              <div className="text-xs text-slate-500">
                Session: {issue.sessionId ?? issue.id} · {String(issue.metadata?.context ?? "website")} ·
                {` ${new Date(issue.createdAt).toLocaleString()}`}
              </div>
              <div className="text-xs text-slate-500">Lead: {issue.contactName ?? "Unknown"}</div>
              <div className="text-xs text-slate-500">Status: {issue.status === "closed" ? "Resolved" : "Open"}</div>
              {typeof issue.metadata?.screenshot === "string" ? (
                <div className="mt-1 space-y-1">
                  <img src={issue.metadata.screenshot as string} alt="Issue screenshot" className="max-h-32 border" />
                </div>
              ) : null}
              <div className="mt-2 flex gap-2">
                <button onClick={() => void markIssueResolved(issue.id)} className="rounded bg-emerald-600 px-3 py-1 text-white">
                  Mark resolved
                </button>
                <button onClick={() => void archiveIssueReport(issue.id)} className="rounded bg-slate-600 px-3 py-1 text-white">
                  Archive
                </button>
                <button
                  disabled={!canModerateChat || issue.status !== "closed"}
                  onClick={() => void removeIssue(issue.id)}
                  className="rounded bg-rose-600 px-3 py-1 text-white disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {!issueReports.length && <div className="text-slate-500">No issue reports.</div>}
        </div>
      </div>
    </div>
  );
}

function disconnectAiSocketSafe(disconnect?: unknown) {
  if (typeof disconnect === "function") {
    disconnect();
  }
}
