import type { CalendarEvent } from "@/api/calendar";
import { groupEventsByDay, sortEvents } from "./utils";

const EventBlock = ({ title, time, subtitle, color }: { title: string; time: string; subtitle?: string; color?: string }) => (
  <div className="calendar-event" style={{ borderLeft: `4px solid ${color || "var(--brand-600, #2563eb"}` }}>
    <div className="calendar-event__title">{title}</div>
    <div className="calendar-event__meta">{time}</div>
    {subtitle && <div className="calendar-event__subtitle">{subtitle}</div>}
  </div>
);

const DayView = ({ date, localEvents }: { date: Date; localEvents: CalendarEvent[] }) => {
  const dayKey = date.toDateString();
  const events = sortEvents(groupEventsByDay(localEvents)[dayKey] ?? []);

  return (
    <div className="calendar-view calendar-view--day">
      <h4>{date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</h4>
      {!events.length && <p className="muted">No events scheduled.</p>}
      {events.map((event) => (
        <EventBlock
          key={event.id}
          title={event.title}
          time={`${new Date(event.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${new Date(event.end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
          subtitle={event.description}
        />
      ))}
    </div>
  );
};

export default DayView;
