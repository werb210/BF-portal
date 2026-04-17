import type { CalendarEvent } from "@/api/calendar";
import { groupEventsByDay, sortEvents } from "./utils";

const HOURS = Array.from({ length: 12 }, (_, index) => `${String(index + 8).padStart(2, "0")}:00`);

const DayView = ({ date, localEvents }: { date: Date; localEvents: CalendarEvent[] }) => {
  const dayKey = date.toDateString();
  const events = sortEvents(groupEventsByDay(localEvents)[dayKey] ?? []);

  return (
    <div className="calendar-view calendar-view--day">
      <h4>{date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</h4>
      <div className="calendar-day-timeline">
        {HOURS.map((hour) => (
          <div key={hour} className="calendar-day-timeline__row">
            <span>{hour}</span>
            <div className="calendar-day-timeline__slot" />
          </div>
        ))}
      </div>

      {!events.length && <p className="muted">No events scheduled.</p>}
      {events.map((event) => (
        <div className="calendar-event" key={event.id}>
          <div className="calendar-event__title">{event.title}</div>
          <div className="calendar-event__meta">
            {new Date(event.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            {" - "}
            {new Date(event.end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
          {event.description && <div className="calendar-event__subtitle">{event.description}</div>}
        </div>
      ))}
    </div>
  );
};

export default DayView;
