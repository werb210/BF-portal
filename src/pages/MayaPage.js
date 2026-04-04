import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import MayaChat from "@/components/maya/MayaChat";
import MayaDialer from "@/components/maya/MayaDialer";
export default function MayaPage() {
    return (_jsxs("div", { style: { display: "grid", gap: 16 }, children: [_jsx("h2", { children: "Maya" }), _jsx(MayaChat, {}), _jsx(MayaDialer, {})] }));
}
