import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useAuth } from "@/hooks/useAuth";
import Button from "@/components/ui/Button";
const ReferrerLayout = ({ children }) => {
    const { user, logout } = useAuth();
    return (_jsxs("div", { className: "referrer-layout", children: [_jsxs("header", { className: "referrer-header", children: [_jsxs("div", { children: [_jsx("div", { className: "referrer-header__title", children: "Referrer Portal" }), user?.name && _jsxs("div", { className: "referrer-header__subtitle", children: ["Welcome, ", user.name] })] }), _jsx(Button, { type: "button", variant: "ghost", onClick: logout, children: "Logout" })] }), _jsx("main", { className: "referrer-main", children: children })] }));
};
export default ReferrerLayout;
