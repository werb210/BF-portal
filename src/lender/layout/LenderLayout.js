import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useLenderAuth } from "@/lender/auth/useLenderAuth";
import "@/styles/globals.css";
import "@/styles/lender.css";
const LenderLayout = () => {
    const { user, logout } = useLenderAuth();
    const navigate = useNavigate();
    const handleLogout = () => {
        logout();
        navigate("/lender/login");
    };
    return (_jsxs("div", { className: "lender-shell", children: [_jsxs("aside", { className: "lender-sidebar", children: [_jsxs("div", { className: "lender-sidebar__brand", children: [_jsx("div", { className: "lender-sidebar__logo", "aria-hidden": true, children: "\u26F0\uFE0F" }), _jsxs("div", { children: [_jsx("div", { className: "lender-sidebar__title", children: "Lender Portal" }), _jsx("div", { className: "lender-sidebar__subtitle", children: user?.companyName ?? "" })] })] }), _jsx("nav", { className: "lender-sidebar__nav", children: _jsx(NavLink, { to: "/lender/products", className: ({ isActive }) => isActive ? "lender-nav-link lender-nav-link--active" : "lender-nav-link", children: "My Products" }) })] }), _jsxs("div", { className: "lender-shell__content", children: [_jsxs("header", { className: "lender-topbar", children: [_jsxs("div", { children: [_jsx("div", { className: "lender-topbar__title", children: "Welcome back" }), _jsx("div", { className: "lender-topbar__subtitle", children: "Manage your lender profile and offers" })] }), _jsxs("div", { className: "lender-topbar__user", children: [_jsx("div", { className: "lender-avatar", children: user?.name?.[0] ?? "L" }), _jsxs("div", { className: "lender-topbar__user-meta", children: [_jsx("span", { className: "lender-topbar__user-name", children: user?.name }), _jsx("span", { className: "lender-topbar__user-role", children: "Lender" })] }), _jsx("button", { className: "ui-button ui-button--ghost", onClick: handleLogout, type: "button", children: "Logout" })] })] }), _jsx("main", { className: "lender-shell__main", children: _jsx(Outlet, {}) })] })] }));
};
export default LenderLayout;
