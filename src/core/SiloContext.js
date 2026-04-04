import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext } from "react";
import { getSiloFromHost } from "./silo";
const SiloContext = createContext("BF");
export function SiloProvider({ children, forcedSilo }) {
    const silo = forcedSilo ?? getSiloFromHost();
    return _jsx(SiloContext.Provider, { value: silo, children: children });
}
export function useSilo() {
    return useContext(SiloContext);
}
