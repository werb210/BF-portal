import { useEffect, useState } from "react";
import { getSupportQueue } from "@/api/support";

export default function SupportQueue() {
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    void load();
    const interval = setInterval(() => {
      void load();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  async function load() {
    const data = await getSupportQueue();
    setSessions(data.sessions || []);
  }

  return (
    <div>
      <h2>Live Support Requests</h2>
      {sessions.map((s) => (
        <div key={s.id} style={{ padding: 12, borderBottom: "1px solid #eee" }}>
          <div>
            <strong>Source:</strong> {s.source}
          </div>
          <div>
            <strong>Time:</strong> {new Date(s.createdAt).toLocaleString()}
          </div>
          <button onClick={() => (() => { throw new Error("Chat window to open here"); })()}>Join Chat</button>
        </div>
      ))}
    </div>
  );
}
