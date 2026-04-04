import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
const iconForType = {
    call: "📞",
    sms: "💬",
    email: "✉️",
    note: "📝",
    document: "📄",
    status: "🔄",
    ai: "🤖",
    lender: "🏦",
    system: "⚙️",
    RULE_TRIGGERED: "🧭",
    AUTO_SMS_SENT: "📲",
    AUTO_TASK_CREATED: "✅",
    FOLLOW_UP_REMINDER: "⏰"
};
const callOutcomeIcons = {
    completed: "📞✅",
    voicemail: "📞📮",
    failed: "📞❌",
    "no-answer": "📞⏳",
    canceled: "📞🚫"
};
const formatDuration = (durationSeconds) => {
    if (durationSeconds === undefined)
        return null;
    const minutes = Math.floor(durationSeconds / 60);
    const seconds = durationSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};
const automationMeta = {
    RULE_TRIGGERED: {
        label: "Rule triggered",
        explanation: "Automation rule detected a follow-up condition."
    },
    AUTO_SMS_SENT: {
        label: "Automated SMS sent",
        explanation: "System dispatched a follow-up SMS automatically."
    },
    AUTO_TASK_CREATED: {
        label: "Automated task created",
        explanation: "System created a follow-up task for staff."
    },
    FOLLOW_UP_REMINDER: {
        label: "Follow-up reminder",
        explanation: "Reminder queued for staff attention."
    }
};
const TimelineItem = ({ event, similarCount = 0, onSelectAutomation, isSelected }) => {
    const callMetadata = event.type === "call" ? event.call : undefined;
    const callOutcome = callMetadata?.outcome;
    const icon = callOutcome ? callOutcomeIcons[callOutcome] ?? iconForType[event.type] : iconForType[event.type];
    const date = new Date(event.occurredAt).toLocaleTimeString();
    const automationInfo = automationMeta[event.type];
    const isAutomation = Boolean(automationInfo);
    const durationLabel = formatDuration(callMetadata?.durationSeconds);
    const content = (_jsxs(_Fragment, { children: [_jsx("div", { className: "font-bold", children: automationInfo?.label ?? event.summary }), isAutomation && _jsx("div", { className: "text-sm text-slate-700", children: event.summary }), _jsx("div", { className: "text-sm text-gray-600", children: date }), (automationInfo?.explanation || event.details) && (_jsx("div", { className: "text-sm text-gray-600", children: automationInfo?.explanation ?? event.details })), event.type === "call" && (_jsxs("div", { className: "mt-2 flex flex-col gap-1 text-sm text-slate-700", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [callOutcome && _jsx("span", { className: "rounded-full bg-slate-100 px-2 py-0.5 text-xs uppercase", children: callOutcome }), durationLabel && _jsxs("span", { className: "text-xs text-slate-500", children: ["Duration ", durationLabel] }), callMetadata?.failureReason && (_jsxs("span", { className: "text-xs text-rose-600", children: ["Reason: ", callMetadata.failureReason] }))] }), _jsx("button", { type: "button", className: "text-left text-xs font-semibold text-slate-500", disabled: true, "aria-disabled": "true", children: "\u25B6\uFE0E Play recording (coming soon)" })] })), similarCount > 0 && _jsxs("div", { className: "text-xs text-slate-500", children: ["+", similarCount, " similar events"] })] }));
    if (isAutomation && onSelectAutomation) {
        return (_jsxs("button", { type: "button", className: `timeline-item text-left ${isSelected ? "border border-emerald-200 bg-emerald-50" : ""}`, "data-testid": `timeline-${event.id}`, onClick: () => onSelectAutomation(event), children: [_jsx("div", { className: "timeline-item__icon", children: icon }), _jsx("div", { children: content })] }));
    }
    return (_jsxs("div", { className: "timeline-item", "data-testid": `timeline-${event.id}`, children: [_jsx("div", { className: "timeline-item__icon", children: icon }), _jsx("div", { children: content })] }));
};
export default TimelineItem;
