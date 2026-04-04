import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef } from "react";
import Button from "@/components/ui/Button";
import MessageBubble from "./MessageBubble";
import MessageComposer from "./MessageComposer";
const ConversationViewer = ({ conversation, onSend, onAcknowledgeIssue }) => {
    const scrollRef = useRef(null);
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [conversation?.messages.length]);
    const metadata = useMemo(() => {
        if (!conversation)
            return null;
        return [
            conversation.contactName || "Unnamed contact",
            conversation.applicationName || conversation.applicationId,
            `Channel: ${conversation.type}`,
            conversation.assignedTo ? `Assigned: ${conversation.assignedTo}` : "Unassigned"
        ].filter(Boolean);
    }, [conversation]);
    if (!conversation) {
        return _jsx("div", { className: "text-sm text-slate-500", children: "Select a conversation to get started." });
    }
    const issueScreenshot = typeof conversation?.metadata?.screenshot === "string" ? conversation.metadata.screenshot : undefined;
    return (_jsxs("div", { className: "flex flex-col h-full", children: [_jsxs("div", { className: "flex justify-between items-center mb-3", children: [_jsxs("div", { children: [_jsx("div", { className: "text-lg font-semibold", children: conversation.contactName || conversation.applicationName }), _jsx("div", { className: "text-sm text-slate-500 space-x-2", children: metadata?.map((item) => (_jsx("span", { className: "inline-block", children: item }, item))) }), _jsxs("div", { className: "text-xs text-indigo-700 mt-1 space-x-3", children: [conversation.contactId && _jsx("span", { children: "View in CRM Timeline" }), conversation.applicationId && _jsx("span", { children: "View in Application Card" })] })] }), conversation.type === "issue" && !conversation.acknowledged && (_jsx(Button, { onClick: () => onAcknowledgeIssue?.(conversation.id), variant: "secondary", children: "Acknowledge Issue" }))] }), _jsxs("div", { className: "bg-white border rounded p-3 overflow-y-auto flex-1", "data-testid": "conversation-viewer", ref: scrollRef, children: [conversation.type === "issue" && issueScreenshot && (_jsx("img", { src: issueScreenshot, alt: "Issue screenshot thumbnail", className: "mb-3 max-h-44 rounded border" })), conversation.messages.map((message) => (_jsx(MessageBubble, { message: message }, message.id))), !conversation.messages.length && (_jsx("div", { className: "text-sm text-slate-500", children: "No messages yet. Start the conversation below." }))] }), _jsx(MessageComposer, { conversation: conversation, onSend: (body, channel) => onSend(body, channel) })] }));
};
export default ConversationViewer;
