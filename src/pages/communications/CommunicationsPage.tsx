import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Card from "@/components/ui/Card";
import AppLoading from "@/components/layout/AppLoading";
import ConversationList from "./ConversationList";
import ConversationViewer from "./ConversationViewer";
import { useCommunicationsStore } from "@/state/communications.store";
import { fetchCommunicationThreads, type CommunicationConversation } from "@/api/communications";
import { getErrorMessage } from "@/utils/errors";
import { getRequestId } from "@/utils/requestId";
import RequireRole from "@/components/auth/RequireRole";
import { emitUiTelemetry } from "@/utils/uiTelemetry";
import { useAuth } from "@/hooks/useAuth";
import { ContactSubmissions } from "@/features/support/ContactSubmissions";
import ChatSessionsPanel from "./ChatSessionsPanel";
import ChatPanel from "./ChatPanel";
import { fetchIssueReports } from "@/api/support";
import { logger } from "@/utils/logger";
import { useBusinessUnit } from "@/hooks/useBusinessUnit";
import { normalizeBusinessUnit } from "@/types/businessUnit";
import { BUSINESS_UNIT_CONFIG } from "@/config/businessUnitConfig";
import { withApiBase } from "@/lib/apiBase";

type CommsView = "threads" | "ai-live-chat" | "ai-sessions" | "issue-reports" | "contact-forms";



type WebsiteIssue = {
  id: string;
  message: string;
  screenshot?: string;
  createdAt: string;
};

const WebsiteIssuesPanel = () => {
  const [issues, setIssues] = useState<WebsiteIssue[]>([]);

  useEffect(() => {
    void loadIssues();
  }, []);

  async function loadIssues() {
    const response = await fetchIssueReports();
    const data = response.data;
    setIssues(Array.isArray(data) ? data : []);
  }

  async function deleteIssue(id: string) {
    await fetch(withApiBase(`/api/support/issues/${id}`), { method: "DELETE" });
    setIssues((previous) => previous.filter((issue) => issue.id !== id));
  }

  return (
    <div className="space-y-4">
      <h2 className="mb-4 mt-10 text-xl">Reported Issues</h2>
      {issues.map((issue) => (
        <div key={issue.id} className="mb-4 rounded border p-4">
          <div>
            <strong>Message:</strong> {issue.message}
          </div>
          {issue.screenshot && (
            <img
              src={issue.screenshot}
              className="max-h-40 mt-2 border"
              alt="Issue screenshot thumbnail"
            />
          )}
          <div className="mt-2 text-xs text-slate-500">{new Date(issue.createdAt).toLocaleString()}</div>
          <button onClick={() => void deleteIssue(issue.id)} className="mt-2 text-sm text-red-600">
            Delete
          </button>
        </div>
      ))}
    </div>
  );
};

const CommunicationsContent = () => {
  const {
    setConversations,
    conversations,
    selectedConversationId,
    selectConversation,
    filteredConversations,
    filters,
    setFilters,
    sendReply,
    acknowledgeIssue
  } = useCommunicationsStore();
  const { user } = useAuth();
  const { activeBusinessUnit } = useBusinessUnit();
  const businessUnit = normalizeBusinessUnit(activeBusinessUnit);
  const businessUnitConfig = BUSINESS_UNIT_CONFIG[businessUnit];
  const isAdmin = user?.role?.toLowerCase() === "admin";
  const [view, setView] = useState<CommsView>("threads");
  const selectedConversation = conversations.find((conv) => conv.id === selectedConversationId);

  const { data, isLoading, error } = useQuery<CommunicationConversation[], Error>({
    queryKey: ["communications", businessUnit, "threads"],
    queryFn: () => fetchCommunicationThreads(businessUnit)
  });

  useEffect(() => {
    if (data) {
      setConversations(data);
    }
  }, [data, setConversations]);

  useEffect(() => {
    if (error) {
      logger.error("Failed to load communications", { requestId: getRequestId(), error });
    }
  }, [error]);

  useEffect(() => {
    if (!isLoading && !error) {
      emitUiTelemetry("data_loaded", { view: "communications", count: data?.length ?? 0 });
    }
  }, [data?.length, error, isLoading]);

  return (
    <div className="page space-y-4">
      <Card
        title="Communications Control Room"
        actions={
          <div className="flex gap-2">
            <button onClick={() => setView("threads")}>Threads</button>
            {isAdmin && <button onClick={() => setView("ai-live-chat")}>AI Live Chat</button>}
            {isAdmin && <button onClick={() => setView("ai-sessions")}>AI Sessions</button>}
            {isAdmin && <button onClick={() => setView("issue-reports")}>Issue Report</button>}
            {isAdmin && <button onClick={() => setView("contact-forms")}>Contact Forms</button>}
          </div>
        }
      >
        {!businessUnitConfig.allowClientComms && (
          <p className="text-slate-600">Client communications are disabled for this business unit.</p>
        )}
        {view === "threads" && businessUnitConfig.allowClientComms && (
          <>
            {isLoading && <AppLoading />}
            {error && <p className="text-red-700">{getErrorMessage(error, "Unable to load conversations.")}</p>}
            {!isLoading && !error && data?.length === 0 && <p>No conversations available yet.</p>}
            {!isLoading && !error && data?.length !== 0 && (
              <div className="grid h-[70vh] grid-cols-10 gap-4">
                <div className="col-span-3 border-r pr-3">
                  <ConversationList
                    conversations={filteredConversations()}
                    selectedConversationId={selectedConversationId}
                    filters={filters}
                    onFiltersChange={setFilters}
                    onSelectConversation={selectConversation}
                  />
                </div>
                <div className="col-span-7">
                  <ConversationViewer
                    conversation={selectedConversation}
                    onSend={async (body, channel) => {
                      if (!selectedConversationId) return;
                      await sendReply(selectedConversationId, body, channel);
                    }}
                    onAcknowledgeIssue={async (id) => acknowledgeIssue(id)}
                  />
                </div>
              </div>
            )}
          </>
        )}
        {view === "ai-live-chat" && businessUnitConfig.allowClientComms && <ChatPanel />}
        {view === "ai-sessions" && isAdmin && businessUnitConfig.allowClientComms && <ChatSessionsPanel />}
        {view === "issue-reports" && isAdmin && <WebsiteIssuesPanel />}
        {view === "contact-forms" && businessUnitConfig.allowClientComms && <ContactSubmissions isAdmin={isAdmin} />}
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
