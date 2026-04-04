import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const channelIcons = {
    chat: "💬",
    sms: "📱",
    human: "🧑‍💼",
    issue: "⚠️",
    system: "🔔",
    credit_readiness: "📄",
    contact_form: "📝"
};
const badgeColor = (type) => {
    if (type === "human")
        return "bg-orange-100 text-orange-800";
    if (type === "issue")
        return "bg-red-100 text-red-800";
    return "bg-slate-100 text-slate-800";
};
const ConversationItem = ({ conversation, selected, onSelect }) => {
    const lastMessage = conversation.messages[conversation.messages.length - 1];
    const preview = lastMessage?.message ?? conversation.message;
    const unread = conversation.unread ?? 0;
    const icon = channelIcons[conversation.type];
    return (_jsxs("button", { className: `w-full text-left p-3 rounded border mb-2 flex gap-3 ${selected ? "border-indigo-500 bg-indigo-50" : "border-slate-200"} ${conversation.highlighted ? "ring-2 ring-orange-300" : ""}`, onClick: () => onSelect(conversation.id), "data-testid": `conversation-${conversation.id}`, children: [_jsx("div", { className: "text-xl", "aria-label": `${conversation.type} icon`, children: icon }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsx("div", { className: "font-semibold truncate", children: conversation.contactName || conversation.applicationName || "Unassigned Contact" }), _jsx("div", { className: "text-xs text-slate-500", children: new Date(conversation.updatedAt).toLocaleTimeString() })] }), _jsx("div", { className: "text-sm text-slate-600 truncate", children: preview }), _jsxs("div", { className: "flex gap-2 items-center mt-1", children: [_jsx("span", { className: `text-xs px-2 py-1 rounded ${badgeColor(conversation.type)}`, children: conversation.type.toUpperCase() }), _jsxs("span", { className: "text-xs text-slate-500", children: ["Silo: ", conversation.silo] }), conversation.assignedTo && _jsx("span", { className: "text-xs text-slate-500", children: conversation.assignedTo }), unread > 0 && (_jsx("span", { className: "bg-indigo-500 text-white text-xs rounded-full px-2", "aria-label": "unread-count", children: unread }))] })] })] }));
};
export default ConversationItem;
