import type { CalendarEvent } from "@/api/calendar";
import { getWeekDays, groupEventsByDay, sortEvents } from "./utils";

const WeekView = ({ date, localEvents }: { date: Date; localEvents: CalendarEvent[] }) => {
  const days = getWeekDays(date);
  const groupedLocal = groupEventsByDay(localEvents);

  return (
    <div className="calendar-view calendar-view--week">
      <div className="calendar-week-grid">
        {days.map((day) => {
          const dayKey = day.toDateString();
          const events = sortEvents(groupedLocal[dayKey] ?? []);
          return (
            <div key={day.toISOString()} className="calendar-week-grid__cell">
              <div className="calendar-week-grid__header">{day.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</div>
              {!events.length && <div className="muted">—</div>}
              {events.map((event) => (
                <div key={event.id} className="calendar-event">
                  <div className="calendar-event__title">{event.title}</div>
                  <div className="calendar-event__meta">
                    {new Date(event.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -
                    {" "}
                    {new Date(event.end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WeekView;
