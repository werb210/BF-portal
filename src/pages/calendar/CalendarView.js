import { jsx as _jsx } from "react/jsx-runtime";
import DayView from "./DayView";
import MonthView from "./MonthView";
import WeekView from "./WeekView";
const CalendarView = ({ view, date, localEvents }) => {
    if (view === "day")
        return _jsx(DayView, { date: date, localEvents: localEvents });
    if (view === "month")
        return _jsx(MonthView, { date: date, localEvents: localEvents });
    return _jsx(WeekView, { date: date, localEvents: localEvents });
};
export default CalendarView;
