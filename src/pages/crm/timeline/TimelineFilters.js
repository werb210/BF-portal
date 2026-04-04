import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Button from "@/components/ui/Button";
const eventTypes = [
    "call",
    "sms",
    "email",
    "note",
    "document",
    "status",
    "ai",
    "lender",
    "system",
    "RULE_TRIGGERED",
    "AUTO_SMS_SENT",
    "AUTO_TASK_CREATED",
    "FOLLOW_UP_REMINDER"
];
const TimelineFilters = ({ activeTypes, onToggle, onReset }) => (_jsxs("div", { className: "flex gap-2 flex-wrap items-center mb-2", "data-testid": "timeline-filters", children: [eventTypes.map((type) => (_jsxs("label", { className: "flex gap-1 items-center", children: [_jsx("input", { type: "checkbox", checked: activeTypes.includes(type), onChange: () => onToggle(type) }), type] }, type))), _jsx(Button, { variant: "secondary", onClick: onReset, children: "Reset Filters" })] }));
export default TimelineFilters;
