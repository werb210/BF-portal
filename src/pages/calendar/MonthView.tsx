import type { CalendarEvent } from "@/api/calendar";
import { getMonthGrid, groupEventsByDay } from "./utils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MonthView = ({ date, localEvents }: { date: Date; localEvents: CalendarEvent[] }) => {
  const grid = getMonthGrid(date);
  const groupedLocal = groupEventsByDay(localEvents);
  const month = date.getMonth();

  return (
    <div className="calendar-view calendar-view--month">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          border: "1px solid #e2e8f0",
          borderBottom: "none",
          borderRadius: "10px 10px 0 0",
          overflow: "hidden",
        }}
      >
        {WEEKDAYS.map((label) => (
          <div key={label} style={{ padding: "8px 10px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", fontWeight: 700, fontSize: 12, color: "#475569" }}>
            {label}
          </div>
        ))}
      </div>
      <div className="calendar-month-grid" style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
        {grid.map((day) => {
          const isCurrentMonth = day.getMonth() === month;
          const dayKey = day.toDateString();
          const events = groupedLocal[dayKey] ?? [];
          return (
            <div
              key={day.toISOString()}
              className="calendar-month-grid__cell"
              style={{
                minHeight: 80,
                border: "1px solid #e2e8f0",
                borderTop: "none",
                borderLeftWidth: 0,
                padding: 8,
                background: isCurrentMonth ? "#fff" : "#f8fafc",
              }}
            >
              <div className="calendar-month-grid__header" style={{ fontWeight: 700, color: isCurrentMonth ? "#0f172a" : "#94a3b8" }}>{day.getDate()}</div>
              {events.slice(0, 3).map((event) => (
                <div key={event.id} className="calendar-event small">
                  <div className="calendar-event__title">{event.title}</div>
                </div>
              ))}
              {events.length > 3 && <div className="muted">+{events.length - 3} more</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MonthView;
