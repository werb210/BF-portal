import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const roleStyles = {
    user: "bg-slate-100 text-slate-900 self-start",
    ai: "bg-blue-500 text-white self-start",
    staff: "bg-slate-800 text-white self-end"
};
const ChatMessage = ({ message }) => (_jsxs("div", { className: `max-w-[80%] rounded-xl px-3 py-2 text-sm shadow-sm ${roleStyles[message.role]}`, children: [_jsx("p", { children: message.message }), _jsx("p", { className: "mt-1 text-[11px] opacity-70", children: new Date(message.created_at).toLocaleString() })] }));
export default ChatMessage;
