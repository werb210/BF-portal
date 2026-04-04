import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
const SettingsOverview = () => {
    const { user } = useAuth();
    const isAdmin = user?.role === "Admin";
    return (_jsxs("section", { className: "settings-panel", "aria-label": "Settings overview", children: [_jsxs("header", { children: [_jsx("h2", { children: "Settings" }), _jsx("p", { children: "Choose a section to manage profile, branding, runtime verification, or user access." })] }), _jsxs("div", { className: "settings-overview", children: [_jsxs(Link, { className: "settings-overview__card", to: "/settings/profile", children: [_jsx("h3", { children: "My Profile" }), _jsx("p", { children: "Update your name, phone, and connected accounts." })] }), _jsxs(Link, { className: "settings-overview__card", to: "/settings/branding", children: [_jsx("h3", { children: "Branding" }), _jsx("p", { children: "Upload and resize the portal logo." })] }), _jsxs(Link, { className: "settings-overview__card", to: "/settings/runtime", children: [_jsx("h3", { children: "Runtime Verification" }), _jsx("p", { children: "Monitor health, schema, CORS, and build info." })] }), isAdmin && (_jsxs(Link, { className: "settings-overview__card", to: "/settings/users", children: [_jsx("h3", { children: "User Management" }), _jsx("p", { children: "Admin-only access to add, edit, and disable users." })] }))] })] }));
};
export default SettingsOverview;
