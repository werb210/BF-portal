import type { CalendarEvent } from "@/api/calendar";
import { getWeekDays, groupEventsByDay, sortEvents } from "./utils";

const HOURS = Array.from({ length: 12 }, (_, index) => `${String(index + 8).padStart(2, "0")}:00`);

const WeekView = ({ date, localEvents }: { date: Date; localEvents: CalendarEvent[] }) => {
  const days = getWeekDays(date);
  const groupedLocal = groupEventsByDay(localEvents);

  return (
    <div className="calendar-view calendar-view--week">
      <div className="calendar-week-head">
        {days.map((day) => (
          <div key={day.toISOString()} className="calendar-week-head__day">
            {day.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
          </div>
        ))}
      </div>

      <div className="calendar-week-body">
        <div className="calendar-week-body__times">
          {HOURS.map((hour) => (
            <div key={hour} className="calendar-week-body__time">{hour}</div>
          ))}
        </div>

        <div className="calendar-week-body__columns">
          {days.map((day) => {
            const dayKey = day.toDateString();
            const events = sortEvents(groupedLocal[dayKey] ?? []);

            return (
              <div key={day.toISOString()} className="calendar-week-column">
                {HOURS.map((hour) => (
                  <div key={`${day.toISOString()}-${hour}`} className="calendar-week-column__slot" />
                ))}
                {events.map((event) => (
                  <div key={event.id} className="calendar-event">
                    <div className="calendar-event__title">{event.title}</div>
                    <div className="calendar-event__meta">
                      {new Date(event.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {" - "}
                      {new Date(event.end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WeekView;
