import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const alignment = (direction) => direction === "out" ? "items-end" : "items-start";
const bubbleColor = (direction, type) => {
    if (type === "human")
        return "bg-orange-100 text-orange-900";
    if (type === "issue")
        return "bg-red-100 text-red-900";
    return direction === "out" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-800";
};
const MessageBubble = ({ message }) => (_jsx("div", { className: `flex flex-col ${alignment(message.direction)} mb-2`, children: _jsxs("div", { className: `rounded px-3 py-2 max-w-xl ${bubbleColor(message.direction, message.type)}`, children: [_jsx("div", { className: "text-sm whitespace-pre-wrap", "data-testid": "message-text", children: message.message }), _jsxs("div", { className: "text-[10px] opacity-75 text-right mt-1", children: [new Date(message.createdAt).toLocaleString(), " \u2022 ", message.type.toUpperCase()] })] }) }));
export default MessageBubble;
