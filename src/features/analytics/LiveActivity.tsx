import { useEffect, useState } from "react";
import { api } from "@/api";

type ActivityEvent = { event?: string; source?: string };

export default function LiveActivity() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const result = await api<{ events?: ActivityEvent[] }>("/api/support/events");
      setEvents(result.events || []);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h2>Live Website Activity</h2>
      {events.map((e, idx) => (
        <div key={idx}>
          {e.event} – {e.source}
        </div>
      ))}
    </div>
  );
}
