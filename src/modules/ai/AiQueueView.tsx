import { useEffect, useState } from "react";
import { withApiBase } from "@/lib/apiBase";

type Session = {
  id: string;
  status: "ai" | "queued" | "live" | "closed";
  created_at: string;
};

export default function AiQueueView() {
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    fetch(withApiBase("/api/chat/sessions"))
      .then((res) => res.json())
      .then(setSessions)
      .catch(() => setSessions([]));
  }, []);

  async function takeSession(id: string) {
    await fetch(withApiBase("/api/ai/take"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: id })
    });

    window.location.href = `/portal/ai/${id}`;
  }

  return (
    <div className="p-6">
      <h2 className="mb-4 text-xl font-semibold">AI Live Chat Queue</h2>

      <div className="space-y-3">
        {sessions.map((s) => (
          <div key={s.id} className="flex justify-between rounded border p-4">
            <div>
              <div>Session: {s.id}</div>
              <div>Status: {s.status}</div>
            </div>

            {s.status === "queued" && (
              <button onClick={() => takeSession(s.id)} className="rounded bg-blue-600 px-4 py-2 text-white">
                Take Over
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
