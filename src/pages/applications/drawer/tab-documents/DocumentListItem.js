import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const statusClass = (status) => `doc-status doc-status--${status?.toLowerCase()}`;
const DocumentListItem = ({ document, isSelected, onSelect }) => (_jsxs("button", { type: "button", className: `document-list-item ${isSelected ? "selected" : ""}`, onClick: onSelect, children: [_jsx("div", { className: "document-list-item__name", children: document.name }), _jsx("div", { className: statusClass(document.status), children: document.status }), document.uploadedAt ? _jsxs("div", { className: "document-list-item__meta", children: ["Uploaded ", document.uploadedAt] }) : null] }));
export default DocumentListItem;
