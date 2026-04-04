import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { buildInfo } from "../buildInfo";
export default function SystemStatus() {
    return (_jsxs("div", { style: { padding: "40px", fontFamily: "sans-serif" }, children: [_jsx("h1", { children: "Portal Status" }), _jsxs("p", { children: ["Mode: ", buildInfo.mode] }), _jsxs("p", { children: ["Build Timestamp: ", buildInfo.timestamp] }), _jsx("p", { children: "Status: OK" })] }));
}
