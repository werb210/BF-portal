import { jsx as _jsx } from "react/jsx-runtime";
import { SiloProvider } from "@/core/SiloContext";
export function TestProviders({ children }) {
    return _jsx(SiloProvider, { forcedSilo: "BF", children: children });
}
