import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { groupEventsByDay, sortEvents } from "./utils";
const EventBlock = ({ title, time, subtitle, color }) => (_jsxs("div", { className: "calendar-event", style: { borderLeft: `4px solid ${color || "var(--brand-600, #2563eb"}` }, children: [_jsx("div", { className: "calendar-event__title", children: title }), _jsx("div", { className: "calendar-event__meta", children: time }), subtitle && _jsx("div", { className: "calendar-event__subtitle", children: subtitle })] }));
const DayView = ({ date, localEvents }) => {
    const dayKey = date.toDateString();
    const events = sortEvents(groupEventsByDay(localEvents)[dayKey] ?? []);
    return (_jsxs("div", { className: "calendar-view calendar-view--day", children: [_jsx("h4", { children: date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" }) }), !events.length && _jsx("p", { className: "muted", children: "No events scheduled." }), events.map((event) => (_jsx(EventBlock, { title: event.title, time: `${new Date(event.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${new Date(event.end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`, subtitle: event.description }, event.id)))] }));
};
export default DayView;
