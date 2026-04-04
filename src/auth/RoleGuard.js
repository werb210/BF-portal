import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import AccessRestricted from "../components/AccessRestricted";
export function RoleGuard({ role, allowed, children, }) {
    if (!allowed.includes(role)) {
        return _jsx(AccessRestricted, {});
    }
    return _jsx(_Fragment, { children: children });
}
