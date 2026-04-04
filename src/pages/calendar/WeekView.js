import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { getWeekDays, groupEventsByDay, sortEvents } from "./utils";
const WeekView = ({ date, localEvents }) => {
    const days = getWeekDays(date);
    const groupedLocal = groupEventsByDay(localEvents);
    return (_jsx("div", { className: "calendar-view calendar-view--week", children: _jsx("div", { className: "calendar-week-grid", children: days.map((day) => {
                const dayKey = day.toDateString();
                const events = sortEvents(groupedLocal[dayKey] ?? []);
                return (_jsxs("div", { className: "calendar-week-grid__cell", children: [_jsx("div", { className: "calendar-week-grid__header", children: day.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) }), !events.length && _jsx("div", { className: "muted", children: "\u2014" }), events.map((event) => (_jsxs("div", { className: "calendar-event", children: [_jsx("div", { className: "calendar-event__title", children: event.title }), _jsxs("div", { className: "calendar-event__meta", children: [new Date(event.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), " -", " ", new Date(event.end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })] })] }, event.id)))] }, day.toISOString()));
            }) }) }));
};
export default WeekView;
