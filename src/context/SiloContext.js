import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
const SiloContext = createContext(undefined);
export function SiloProvider({ children }) {
    const [silo, setSilo] = useState("bf");
    const auth = useAuth();
    const allowedSilos = auth.allowedSilos ?? [];
    const canAccessSilo = auth.canAccessSilo ?? (() => true);
    useEffect(() => {
        if (!allowedSilos.length)
            return;
        if (!canAccessSilo(silo)) {
            const nextSilo = allowedSilos[0];
            if (nextSilo)
                setSilo(nextSilo);
        }
    }, [allowedSilos, canAccessSilo, silo]);
    return _jsx(SiloContext.Provider, { value: { silo, setSilo }, children: children });
}
export function useSilo() {
    const ctx = useContext(SiloContext);
    if (!ctx)
        throw new Error("SiloProvider missing");
    return ctx;
}
export default SiloContext;
