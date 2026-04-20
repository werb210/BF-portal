import type { CalendarEvent } from "@/api/calendar";

const HOURS = Array.from({ length: 16 }, (_, idx) => 6 + idx);

const formatHourLabel = (hour: number) =>
  new Date(2000, 0, 1, hour).toLocaleTimeString([], { hour: "numeric" });

const formatTimeRange = (start: string, end: string) =>
  `${new Date(start).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} - ${new Date(end).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;

const DayView = ({ date, localEvents }: { date: Date; localEvents: CalendarEvent[] }) => {
  const eventsByHour = new Map<number, CalendarEvent[]>();
  localEvents.forEach((event) => {
    const start = new Date(event.start);
    if (start.toDateString() !== date.toDateString()) return;
    const key = start.getHours();
    const list = eventsByHour.get(key) ?? [];
    list.push(event);
    eventsByHour.set(key, list);
  });

  return (
    <div
      className="calendar-view calendar-view--day"
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 10,
        overflowY: "auto",
        maxHeight: "calc(100vh - 300px)",
        background: "#fff",
      }}
    >
      <div style={{ padding: "12px 14px", borderBottom: "1px solid #e2e8f0", fontWeight: 700 }}>
        {date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
      </div>
      {HOURS.map((hour) => {
        const events = eventsByHour.get(hour) ?? [];
        return (
          <div
            key={hour}
            style={{ display: "grid", gridTemplateColumns: "80px 1fr", minHeight: 64, borderBottom: "1px solid #f1f5f9" }}
          >
            <div style={{ padding: "10px 8px", textAlign: "right", color: "#64748b", fontSize: 12 }}>{formatHourLabel(hour)}</div>
            <div style={{ padding: 8 }}>
              {events.map((event) => (
                <div
                  key={event.id}
                  style={{
                    background: "#dcfce7",
                    borderLeft: "3px solid #16a34a",
                    borderRadius: 6,
                    padding: "6px 8px",
                    marginBottom: 4,
                  }}
                >
                  <div style={{ fontWeight: 700, color: "#14532d", fontSize: 13 }}>{event.title}</div>
                  <div style={{ color: "#166534", fontSize: 12 }}>{formatTimeRange(event.start, event.end)}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DayView;
