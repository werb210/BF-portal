import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
import { useAuthorization } from "@/hooks/useAuthorization";
const ActionGate = ({ roles = [], capabilities = [], fallback = null, children }) => {
    const allowed = useAuthorization({ roles, capabilities });
    if (!allowed) {
        return _jsx(_Fragment, { children: fallback });
    }
    return _jsx(_Fragment, { children: children });
};
export default ActionGate;
