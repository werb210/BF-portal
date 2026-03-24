import { useEffect, useState } from "react";
import { buildUrl } from "@/lib/api";

export default function LiveActivity() {
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch (buildUrl("/api" + "/support/events"));
      const data = await res.json();
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
