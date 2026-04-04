import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from "react";
import Card from "@/components/ui/Card";
import { getRoleLabel } from "@/utils/roles";
const defaultMessage = "You do not have permission to view this page.";
const AccessRestricted = ({ message = defaultMessage, requiredRoles = [] }) => {
    const roleLabel = useMemo(() => requiredRoles.map((role) => getRoleLabel(role)).join(", "), [requiredRoles]);
    return (_jsx("div", { className: "page", children: _jsxs(Card, { title: "Access restricted", children: [_jsx("p", { children: message }), requiredRoles.length > 0 ? (_jsxs("p", { className: "text-sm text-slate-500", children: ["Required roles: ", roleLabel, "."] })) : null] }) }));
};
export default AccessRestricted;
