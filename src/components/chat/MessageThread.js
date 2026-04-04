import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const resolveSenderLabel = (message) => {
    if (message.senderName)
        return message.senderName;
    if (message.senderType)
        return message.senderType;
    return "Unidentified sender";
};
const resolveStatusLabel = (message) => {
    if (message.status)
        return message.status;
    if (message.readAt)
        return "read";
    return "unread";
};
const MessageThread = ({ messages }) => (_jsx("div", { className: "messages-thread", children: messages.length ? (messages.map((message) => (_jsxs("div", { className: "note-message", children: [_jsx("div", { className: "note-message__avatar", children: resolveSenderLabel(message).slice(0, 2).toUpperCase() }), _jsxs("div", { className: "note-message__body", children: [_jsx("div", { className: "note-message__author", children: resolveSenderLabel(message) }), _jsx("div", { className: "note-message__text", children: message.body }), _jsxs("div", { className: "note-message__timestamp", children: [message.createdAt, message.source ? ` · ${message.source}` : "", message.status || message.readAt ? ` · ${resolveStatusLabel(message)}` : ""] })] })] }, message.id)))) : (_jsx("div", { className: "drawer-placeholder", children: "No messages yet." })) }));
export default MessageThread;
