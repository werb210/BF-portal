import { Fragment } from "react";
import type { CalendarEvent } from "@/api/calendar";
import { getWeekDays } from "./utils";

const HOURS = Array.from({ length: 16 }, (_, idx) => 6 + idx); // 6 AM - 9 PM

const formatHourLabel = (hour: number) =>
  new Date(2000, 0, 1, hour).toLocaleTimeString([], { hour: "numeric" });

const formatTimeRange = (start: string, end: string) =>
  `${new Date(start).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} - ${new Date(end).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;

const WeekView = ({ date, localEvents, onEventClick, onTaskClick }: { date: Date; localEvents: CalendarEvent[]; onEventClick?: (event: CalendarEvent) => void; onTaskClick?: (task: unknown) => void }) => {
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
        border: "1px solid var(--ui-border)",
        borderRadius: 10,
        background: "var(--ui-surface-strong)",
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "60px repeat(7, 1fr)", minWidth: 900 }}>
        <div style={{ borderBottom: "1px solid var(--ui-border)", background: "var(--ui-surface-muted)" }} />
        {days.map((day) => {
          const isToday = day.toDateString() === today;
          return (
            <div
              key={`head-${day.toISOString()}`}
              style={{
                padding: "10px 8px",
                borderBottom: "1px solid var(--ui-border)",
                borderLeft: "1px solid var(--ui-border)",
                textAlign: "center",
                fontWeight: 700,
                color: isToday ? "var(--ui-accent-blue)" : "var(--ui-text-muted)",
                background: isToday ? "rgba(47, 168, 106, 0.12)" : "var(--ui-surface-muted)",
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
                borderBottom: "1px solid var(--ui-border)",
                color: "var(--ui-text-muted)",
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
                    borderBottom: "1px solid var(--ui-border)",
                    borderLeft: "1px solid var(--ui-border)",
                    padding: 6,
                    background: "var(--ui-surface-strong)",
                  }}
                >
                  {events.map((event) => (
                    (() => {
                      const resource = (event as any).resource;
                      const isTask = resource?.__kind === "task";
                      return (
                        <div
                          key={event.id}
                          onClick={() => isTask ? onTaskClick?.(resource.task) : onEventClick?.(event)}
                          style={{
                            padding: "6px 8px",
                            borderRadius: 6,
                            background: isTask ? "#fed7aa" : "rgba(47, 168, 106, 0.12)",
                            borderLeft: `3px solid ${isTask ? "#c2410c" : "var(--ui-accent-blue)"}`,
                            marginBottom: 4,
                            cursor: "pointer",
                          }}
                        >
                          <div style={{ fontSize: 12, fontWeight: 700, color: isTask ? "#9a3412" : "var(--ui-accent-blue)" }}>{isTask ? "✓ " : ""}{event.title}</div>
                          <div style={{ fontSize: 11, color: isTask ? "#9a3412" : "var(--ui-accent-blue)" }}>{formatTimeRange(event.start, event.end)}</div>
                        </div>
                      );
                    })()
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
