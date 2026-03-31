import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/apiClient";

export default function LiveActivity() {
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const data = await apiRequest<{ events?: any[] }>("/support/events");
      setEvents(data.events || []);
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
