import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Button from "@/components/ui/Button";
const CompanyRow = ({ company, onSelect }) => (_jsxs("tr", { "data-testid": `company-row-${company.id}`, children: [_jsx("td", { children: _jsxs("div", { className: "crm-name", children: [_jsx("span", { children: company.name }), company.referrerName ? (_jsxs("span", { className: "referrer-badge", children: ["Referred by ", company.referrerName] })) : null] }) }), _jsx("td", { children: company.industry }), _jsx("td", { children: company.silo }), _jsx("td", { children: company.owner }), _jsx("td", { children: company.tags.join(", ") }), _jsx("td", { children: _jsx(Button, { onClick: () => onSelect(company), children: "Details" }) })] }));
export default CompanyRow;
