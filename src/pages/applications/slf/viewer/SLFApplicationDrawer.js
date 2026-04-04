import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import SLFTabApplication from "./SLFTabApplication";
import SLFTabDocuments from "./SLFTabDocuments";
import SLFTabNotes from "./SLFTabNotes";
import { useState } from "react";
const TABS = [
    { id: "application", label: "Application Data" },
    { id: "documents", label: "Documents" },
    { id: "notes", label: "Notes" }
];
const SLFApplicationDrawer = ({ applicationId, onClose }) => {
    const [tab, setTab] = useState("application");
    if (!applicationId)
        return null;
    return (_jsx("div", { className: "application-drawer-overlay", children: _jsxs("div", { className: "application-drawer", children: [_jsxs("div", { className: "application-drawer__header", children: [_jsxs("div", { children: [_jsxs("div", { className: "application-drawer__title", children: ["SLF Application ", applicationId] }), _jsx("div", { className: "application-drawer__subtitle", children: "SLF silo viewer" })] }), _jsx("button", { className: "btn", onClick: onClose, children: "Close" })] }), _jsx("div", { className: "tabs", children: TABS.map((t) => (_jsx("button", { className: `tab ${tab === t.id ? "tab--active" : ""}`, onClick: () => setTab(t.id), children: t.label }, t.id))) }), _jsxs("div", { className: "application-drawer__content", children: [tab === "application" && _jsx(SLFTabApplication, { applicationId: applicationId }), tab === "documents" && _jsx(SLFTabDocuments, { applicationId: applicationId }), tab === "notes" && _jsx(SLFTabNotes, { applicationId: applicationId })] })] }) }));
};
export default SLFApplicationDrawer;
