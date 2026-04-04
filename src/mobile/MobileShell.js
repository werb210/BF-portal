import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useLocation, Link } from "react-router-dom";
export default function MobileShell({ children }) {
    const location = useLocation();
    const active = (path) => location.pathname.startsWith(path)
        ? "text-white"
        : "text-white/40";
    return (_jsxs("div", { className: "min-h-screen bg-[#020C1C] text-white flex flex-col", children: [_jsx("header", { className: "h-14 flex items-center justify-center border-b border-white/10", children: _jsx("h1", { className: "text-sm font-semibold", children: "Boreal Portal" }) }), _jsx("main", { className: "flex-1 overflow-y-auto", children: children }), _jsxs("nav", { className: "h-14 border-t border-white/10 flex justify-around items-center text-sm", children: [_jsx(Link, { to: "/dashboard", className: active("/dashboard"), children: "Dashboard" }), _jsx(Link, { to: "/pipeline", className: active("/pipeline"), children: "Pipeline" }), _jsx(Link, { to: "/crm", className: active("/crm"), children: "CRM" })] })] }));
}
