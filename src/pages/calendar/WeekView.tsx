import { Fragment } from "react";
import type { CalendarEvent } from "@/api/calendar";
import { getWeekDays } from "./utils";

const HOURS = Array.from({ length: 16 }, (_, idx) => 6 + idx); // 6 AM - 9 PM

const formatHourLabel = (hour: number) =>
  new Date(2000, 0, 1, hour).toLocaleTimeString([], { hour: "numeric" });

const formatTimeRange = (start: string, end: string) =>
  `${new Date(start).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} - ${new Date(end).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;

const WeekView = ({ date, localEvents }: { date: Date; localEvents: CalendarEvent[] }) => {
  const days = getWeekDays(date);
  const today = new Date().toDateString();

  const eventsBySlot = new Map<string, CalendarEvent[]>();
  localEvents.forEach((event) => {
    const start = new Date(event.start);
    const key = `${start.toDateString()}-${start.getHours()}`;
    const list = eventsBySlot.get(key) ?? [];
    list.push(event);
    eventsBySlot.set(key, list);
  });

  return (
    <div
      className="calendar-view calendar-view--week"
      style={{
        overflowY: "auto",
        maxHeight: "calc(100vh - 300px)",
        border: "1px solid #e2e8f0",
        borderRadius: 10,
        background: "#fff",
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "60px repeat(7, 1fr)", minWidth: 900 }}>
        <div style={{ borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }} />
        {days.map((day) => {
          const isToday = day.toDateString() === today;
          return (
            <div
              key={`head-${day.toISOString()}`}
              style={{
                padding: "10px 8px",
                borderBottom: "1px solid #e2e8f0",
                borderLeft: "1px solid #e2e8f0",
                textAlign: "center",
                fontWeight: 700,
                color: isToday ? "#2563eb" : "#334155",
                background: isToday ? "#eff6ff" : "#f8fafc",
              }}
            >
              {day.toLocaleDateString(undefined, { weekday: "short" })} {day.getDate()}
            </div>
          );
        })}

        {HOURS.map((hour) => (
          <Fragment key={`row-${hour}`}>
            <div
              key={`time-${hour}`}
              style={{
                minHeight: 64,
                padding: "8px 6px",
                borderBottom: "1px solid #e2e8f0",
                color: "#64748b",
                fontSize: 12,
                textAlign: "right",
              }}
            >
              {formatHourLabel(hour)}
            </div>
            {days.map((day) => {
              const key = `${day.toDateString()}-${hour}`;
              const events = eventsBySlot.get(key) ?? [];
              return (
                <div
                  key={`${day.toISOString()}-${hour}`}
                  style={{
                    minHeight: 64,
                    borderBottom: "1px solid #e2e8f0",
                    borderLeft: "1px solid #e2e8f0",
                    padding: 6,
                    background: "#fff",
                  }}
                >
                  {events.map((event) => (
                    <div
                      key={event.id}
                      style={{
                        padding: "6px 8px",
                        borderRadius: 6,
                        background: "#dbeafe",
                        borderLeft: "3px solid #2563eb",
                        marginBottom: 4,
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#1e3a8a" }}>{event.title}</div>
                      <div style={{ fontSize: 11, color: "#1d4ed8" }}>{formatTimeRange(event.start, event.end)}</div>
                    </div>
                  ))}
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
};

export default WeekView;
