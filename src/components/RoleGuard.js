import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
import { useAuth } from "@/hooks/useAuth";
export function RoleGuard({ role, children }) {
    const { user } = useAuth();
    if (!user)
        return null;
    if (user.role !== role)
        return null;
    return _jsx(_Fragment, { children: children });
}
