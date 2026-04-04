import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Select from "@/components/ui/Select";
const generateRowId = () => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};
export const createEmptyMappingRow = () => ({
    id: generateRowId(),
    columnName: "",
    systemField: ""
});
const SYSTEM_FIELD_OPTIONS = [
    { value: "business.legal_name", label: "Business name" },
    { value: "business.dba_name", label: "Business DBA" },
    { value: "business.tax_id", label: "Business tax ID" },
    { value: "application.amount", label: "Application amount" },
    { value: "application.term", label: "Application term" },
    { value: "application.purpose", label: "Loan purpose" },
    { value: "owner.first_name", label: "Owner first name" },
    { value: "owner.last_name", label: "Owner last name" },
    { value: "owner.email", label: "Owner email" },
    { value: "owner.phone", label: "Owner phone" }
];
const GoogleSheetMappingEditor = ({ rows, onChange, error }) => {
    const handleRowChange = (id, updates) => {
        onChange(rows.map((row) => (row.id === id ? { ...row, ...updates } : row)));
    };
    const handleAddRow = () => {
        onChange([...rows, createEmptyMappingRow()]);
    };
    const handleRemoveRow = (id) => {
        const nextRows = rows.filter((row) => row.id !== id);
        onChange(nextRows.length ? nextRows : [createEmptyMappingRow()]);
    };
    return (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "grid grid-cols-1 gap-2 text-xs text-slate-500 md:grid-cols-[1fr_1fr_auto]", children: [_jsx("span", { children: "Sheet column name" }), _jsx("span", { children: "System field" }), _jsx("span", { className: "sr-only", children: "Actions" })] }), rows.map((row) => (_jsxs("div", { className: "grid grid-cols-1 items-center gap-2 md:grid-cols-[1fr_1fr_auto]", children: [_jsxs("label", { className: "ui-field", children: [_jsx("span", { className: "ui-field__label sr-only", children: "Sheet column name" }), _jsx("input", { className: "ui-input", placeholder: "e.g. Business Name", value: row.columnName, onChange: (event) => handleRowChange(row.id, { columnName: event.target.value }) })] }), _jsxs(Select, { label: "System field", hideLabel: true, value: row.systemField, onChange: (event) => handleRowChange(row.id, { systemField: event.target.value }), children: [_jsx("option", { value: "", children: "Select field" }), SYSTEM_FIELD_OPTIONS.map((option) => (_jsx("option", { value: option.value, children: option.label }, option.value)))] }), _jsx("button", { type: "button", className: "btn btn--secondary", onClick: () => handleRemoveRow(row.id), children: "Remove" })] }, row.id))), _jsx("div", { children: _jsx("button", { type: "button", className: "btn btn--secondary", onClick: handleAddRow, children: "Add column" }) }), error ? _jsx("div", { className: "ui-field__error", children: error }) : null] }));
};
export default GoogleSheetMappingEditor;
