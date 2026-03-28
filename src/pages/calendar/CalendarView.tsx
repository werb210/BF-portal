import type { CalendarEvent } from "@/api/calendar";
import type { CalendarView as CalendarViewType } from "@/state/calendar.store";
import DayView from "./DayView";
import MonthView from "./MonthView";
import WeekView from "./WeekView";

export type CalendarViewProps = {
  view: CalendarViewType;
  date: Date;
  localEvents: CalendarEvent[];
};

const CalendarView = ({ view, date, localEvents }: CalendarViewProps) => {
  if (view === "day") return <DayView date={date} localEvents={localEvents} />;
  if (view === "month") return <MonthView date={date} localEvents={localEvents} />;
  return <WeekView date={date} localEvents={localEvents} />;
};

export default CalendarView;
