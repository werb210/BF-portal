import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import ChatInterface from "@/components/maya/ChatInterface";
export default function MayaPanel({ open, onClose }) {
    if (!open)
        return null;
    return (_jsxs("div", { className: "fixed left-0 top-0 z-50 h-full w-96 bg-white shadow-xl", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-slate-200 p-4", children: [_jsx("h2", { className: "font-bold", children: "Maya Assistant" }), _jsx("button", { onClick: onClose, className: "text-sm text-slate-600", children: "Close" })] }), _jsx(ChatInterface, {})] }));
}
