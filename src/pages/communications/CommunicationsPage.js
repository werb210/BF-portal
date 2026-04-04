import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Card from "@/components/ui/Card";
import AppLoading from "@/components/layout/AppLoading";
import ConversationList from "./ConversationList";
import ConversationViewer from "./ConversationViewer";
import { useCommunicationsStore } from "@/state/communications.store";
import { fetchCommunicationThreads } from "@/api/communications";
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
const WebsiteIssuesPanel = () => {
    const [issues, setIssues] = useState([]);
    useEffect(() => {
        void loadIssues();
    }, []);
    async function loadIssues() {
        const response = await fetchIssueReports();
        setIssues(Array.isArray(response) ? response : []);
    }
    async function deleteIssue(id) {
        // Endpoint intentionally disabled until server contract supports issue deletion.
        setIssues((previous) => previous.filter((issue) => issue.id !== id));
    }
    return (_jsxs("div", { className: "space-y-4", children: [_jsx("h2", { className: "mb-4 mt-10 text-xl", children: "Reported Issues" }), issues.map((issue) => (_jsxs("div", { className: "mb-4 rounded border p-4", children: [_jsxs("div", { children: [_jsx("strong", { children: "Message:" }), " ", issue.message] }), issue.screenshot && (_jsx("img", { src: issue.screenshot, className: "max-h-40 mt-2 border", alt: "Issue screenshot thumbnail" })), _jsx("div", { className: "mt-2 text-xs text-slate-500", children: new Date(issue.createdAt).toLocaleString() }), _jsx("button", { onClick: () => void deleteIssue(issue.id), className: "mt-2 text-sm text-red-600", children: "Delete" })] }, issue.id)))] }));
};
const CommunicationsContent = () => {
    const { setConversations, conversations, selectedConversationId, selectConversation, filteredConversations, filters, setFilters, sendReply, acknowledgeIssue } = useCommunicationsStore();
    const { user } = useAuth();
    const { activeBusinessUnit } = useBusinessUnit();
    const businessUnit = normalizeBusinessUnit(activeBusinessUnit);
    const businessUnitConfig = BUSINESS_UNIT_CONFIG[businessUnit];
    const isAdmin = user?.role?.toLowerCase() === "admin";
    const [view, setView] = useState("threads");
    const selectedConversation = conversations.find((conv) => conv.id === selectedConversationId);
    const { data, isLoading, error } = useQuery({
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
    return (_jsx("div", { className: "page space-y-4", children: _jsxs(Card, { title: "Communications Control Room", actions: _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => setView("threads"), children: "Threads" }), isAdmin && _jsx("button", { onClick: () => setView("ai-live-chat"), children: "AI Live Chat" }), isAdmin && _jsx("button", { onClick: () => setView("ai-sessions"), children: "AI Sessions" }), isAdmin && _jsx("button", { onClick: () => setView("issue-reports"), children: "Issue Report" }), isAdmin && _jsx("button", { onClick: () => setView("contact-forms"), children: "Contact Forms" })] }), children: [!businessUnitConfig.allowClientComms && (_jsx("p", { className: "text-slate-600", children: "Client communications are disabled for this business unit." })), view === "threads" && businessUnitConfig.allowClientComms && (_jsxs(_Fragment, { children: [isLoading && _jsx(AppLoading, {}), error && _jsx("p", { className: "text-red-700", children: getErrorMessage(error, "Unable to load conversations.") }), !isLoading && !error && data?.length === 0 && _jsx("p", { children: "No conversations available yet." }), !isLoading && !error && data?.length !== 0 && (_jsxs("div", { className: "grid h-[70vh] grid-cols-10 gap-4", children: [_jsx("div", { className: "col-span-3 border-r pr-3", children: _jsx(ConversationList, { conversations: filteredConversations(), selectedConversationId: selectedConversationId, filters: filters, onFiltersChange: setFilters, onSelectConversation: selectConversation }) }), _jsx("div", { className: "col-span-7", children: _jsx(ConversationViewer, { conversation: selectedConversation, onSend: async (body, channel) => {
                                            if (!selectedConversationId)
                                                return;
                                            await sendReply(selectedConversationId, body, channel);
                                        }, onAcknowledgeIssue: async (id) => acknowledgeIssue(id) }) })] }))] })), view === "ai-live-chat" && businessUnitConfig.allowClientComms && _jsx(ChatPanel, {}), view === "ai-sessions" && isAdmin && businessUnitConfig.allowClientComms && _jsx(ChatSessionsPanel, {}), view === "issue-reports" && isAdmin && _jsx(WebsiteIssuesPanel, {}), view === "contact-forms" && businessUnitConfig.allowClientComms && _jsx(ContactSubmissions, { isAdmin: isAdmin })] }) }));
};
const CommunicationsPage = () => (_jsx(RequireRole, { roles: ["Admin", "Staff"], children: _jsx(CommunicationsContent, {}) }));
export default CommunicationsPage;
