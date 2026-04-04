import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchTimeline } from "@/api/crm";
import { useAuth } from "@/hooks/useAuth";
import { fullStaffRoles, hasRequiredRole, resolveUserRole } from "@/utils/roles";
import TimelineItem from "./TimelineItem";
import TimelineFilters from "./TimelineFilters";
const defaultActiveTypes = [
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
const automationTypes = new Set([
    "RULE_TRIGGERED",
    "AUTO_SMS_SENT",
    "AUTO_TASK_CREATED",
    "FOLLOW_UP_REMINDER"
]);
const collapseSimilarEvents = (events) => {
    const windowMs = 1000 * 60 * 5;
    const collapsed = [];
    for (const event of events) {
        const last = collapsed[collapsed.length - 1];
        if (last) {
            const sameRule = (last.event.automation?.ruleId ?? "") === (event.automation?.ruleId ?? "");
            const isSame = last.event.type === event.type && last.event.summary === event.summary && sameRule;
            const timeDelta = Math.abs(new Date(last.event.occurredAt).getTime() - new Date(event.occurredAt).getTime());
            if (isSame && timeDelta <= windowMs) {
                last.similarCount += 1;
                continue;
            }
        }
        collapsed.push({ event, similarCount: 0 });
    }
    return collapsed;
};
const TimelineFeed = ({ entityType, entityId, initialEvents = [] }) => {
    const [activeTypes, setActiveTypes] = useState(defaultActiveTypes);
    const [expandedGroups, setExpandedGroups] = useState({});
    const [selectedAutomation, setSelectedAutomation] = useState(null);
    const { user } = useAuth();
    const canViewAutomationDetails = hasRequiredRole(resolveUserRole(user?.role ?? null), fullStaffRoles);
    const { data: events = initialEvents, refetch } = useQuery({
        queryKey: ["timeline", entityType, entityId],
        queryFn: () => fetchTimeline(entityType, entityId),
        initialData: initialEvents
    });
    useEffect(() => {
        const interval = setInterval(() => {
            refetch();
        }, 30000);
        return () => clearInterval(interval);
    }, [refetch]);
    const grouped = useMemo(() => {
        const filtered = events.filter((event) => activeTypes.includes(event.type));
        return filtered.reduce((acc, event) => {
            const dateKey = new Date(event.occurredAt).toDateString();
            acc[dateKey] = acc[dateKey] ? [...acc[dateKey], event] : [event];
            return acc;
        }, {});
    }, [events, activeTypes]);
    const groupedDisplayItems = useMemo(() => {
        return Object.entries(grouped).map(([date, eventsForDate]) => {
            const sorted = [...eventsForDate].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
            const displayItems = [];
            let buffer = [];
            const flushAutomationGroup = () => {
                if (!buffer.length)
                    return;
                const collapsed = collapseSimilarEvents(buffer);
                const first = buffer[0];
                const last = buffer[buffer.length - 1];
                if (!first || !last)
                    return;
                const title = buffer.length > 1 ? `${first.summary} → ${last.summary}` : first.summary;
                const ruleKey = first.automation?.ruleId ?? "automation";
                const id = `${date}-${ruleKey}-${displayItems.length}`;
                displayItems.push({ kind: "automation", id, title, events: collapsed });
                buffer = [];
            };
            for (const event of sorted) {
                if (automationTypes.has(event.type)) {
                    buffer.push(event);
                }
                else {
                    flushAutomationGroup();
                    displayItems.push({ kind: "event", event, similarCount: 0 });
                }
            }
            flushAutomationGroup();
            return { date, items: displayItems };
        });
    }, [grouped]);
    const toggleType = (type) => {
        setActiveTypes((current) => current.includes(type) ? current.filter((t) => t !== type) : [...current, type]);
    };
    const toggleGroup = (groupId) => {
        setExpandedGroups((current) => ({ ...current, [groupId]: !current[groupId] }));
    };
    const renderAutomationDetails = () => {
        if (!selectedAutomation)
            return null;
        return (_jsxs("div", { className: "mb-4 rounded border border-slate-200 bg-white p-4 shadow-sm", "data-testid": "automation-details", children: [_jsxs("div", { className: "flex items-start justify-between gap-4", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-sm font-semibold text-slate-900", children: "Automation details" }), _jsx("p", { className: "text-xs text-slate-500", children: new Date(selectedAutomation.occurredAt).toLocaleString() })] }), _jsx("button", { type: "button", className: "text-xs font-semibold text-slate-500", onClick: () => setSelectedAutomation(null), children: "Close" })] }), !canViewAutomationDetails ? (_jsx("p", { className: "mt-3 text-sm text-slate-500", children: "Automation metadata is restricted to staff." })) : (_jsxs("dl", { className: "mt-3 grid gap-3 text-sm text-slate-700", children: [_jsxs("div", { children: [_jsx("dt", { className: "font-semibold text-slate-500", children: "Rule ID" }), _jsx("dd", { children: selectedAutomation.automation?.ruleId ?? "Unknown" })] }), _jsxs("div", { children: [_jsx("dt", { className: "font-semibold text-slate-500", children: "Trigger reason" }), _jsx("dd", { children: selectedAutomation.automation?.triggerReason ?? "Not provided" })] }), _jsxs("div", { children: [_jsx("dt", { className: "font-semibold text-slate-500", children: "Time delay condition" }), _jsx("dd", { children: selectedAutomation.automation?.delayCondition ?? "Not provided" })] }), _jsxs("div", { children: [_jsx("dt", { className: "font-semibold text-slate-500", children: "Action taken" }), _jsx("dd", { children: selectedAutomation.automation?.action ?? "Not provided" })] }), selectedAutomation.automation?.internalNotes && (_jsxs("div", { children: [_jsx("dt", { className: "font-semibold text-slate-500", children: "Internal notes" }), _jsx("dd", { children: selectedAutomation.automation.internalNotes })] }))] }))] }));
    };
    return (_jsxs("div", { "data-testid": "timeline-feed", children: [_jsx(TimelineFilters, { activeTypes: activeTypes, onToggle: toggleType, onReset: () => setActiveTypes(defaultActiveTypes) }), renderAutomationDetails(), groupedDisplayItems.map(({ date, items }) => (_jsxs("div", { className: "mb-4", children: [_jsx("h4", { className: "font-semibold", children: date }), _jsx("div", { className: "flex flex-col gap-2", children: items.map((item) => {
                            if (item.kind === "event") {
                                return _jsx(TimelineItem, { event: item.event, similarCount: item.similarCount }, item.event.id);
                            }
                            const isExpanded = Boolean(expandedGroups[item.id]);
                            return (_jsxs("div", { className: "rounded border border-slate-200 bg-slate-50 p-3", "data-testid": `automation-group-${item.id}`, children: [_jsxs("button", { type: "button", className: "flex w-full items-center justify-between text-left", onClick: () => toggleGroup(item.id), "aria-expanded": isExpanded, children: [_jsxs("div", { children: [_jsx("div", { className: "text-xs font-semibold uppercase text-slate-500", children: "Automations" }), _jsx("div", { className: "text-sm font-semibold text-slate-800", children: item.title })] }), _jsxs("div", { className: "text-xs text-slate-500", children: [isExpanded ? "Hide" : "Show", " (", item.events.length, ")"] })] }), isExpanded && (_jsx("div", { className: "mt-3 flex flex-col gap-2", children: item.events.map(({ event, similarCount }) => (_jsx(TimelineItem, { event: event, similarCount: similarCount, onSelectAutomation: setSelectedAutomation, isSelected: selectedAutomation?.id === event.id }, event.id))) }))] }, item.id));
                        }) })] }, date)))] }));
};
export default TimelineFeed;
