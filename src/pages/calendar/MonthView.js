import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { getMonthGrid, groupEventsByDay } from "./utils";
const MonthView = ({ date, localEvents }) => {
    const grid = getMonthGrid(date);
    const groupedLocal = groupEventsByDay(localEvents);
    const month = date.getMonth();
    return (_jsx("div", { className: "calendar-view calendar-view--month", children: _jsx("div", { className: "calendar-month-grid", children: grid.map((day) => {
                const isCurrentMonth = day.getMonth() === month;
                const dayKey = day.toDateString();
                const events = groupedLocal[dayKey] ?? [];
                return (_jsxs("div", { className: `calendar-month-grid__cell ${isCurrentMonth ? "" : "muted"}`, children: [_jsx("div", { className: "calendar-month-grid__header", children: day.getDate() }), events.slice(0, 3).map((event) => (_jsx("div", { className: "calendar-event small", children: _jsx("div", { className: "calendar-event__title", children: event.title }) }, event.id))), events.length > 3 && _jsxs("div", { className: "muted", children: ["+", events.length - 3, " more"] })] }, day.toISOString()));
            }) }) }));
};
export default MonthView;
