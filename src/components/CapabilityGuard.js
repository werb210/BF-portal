import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
import { useAuth } from "@/hooks/useAuth";
import { roleCapabilities } from "@/security/capabilityMap";
export function CapabilityGuard({ capability, children }) {
    const { user } = useAuth();
    const normalizedRole = (user?.role ?? "").toLowerCase();
    if (!roleCapabilities[normalizedRole]?.includes(capability)) {
        return null;
    }
    return _jsx(_Fragment, { children: children });
}
