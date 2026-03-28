import { useEffect, useState } from "react";
import { AiSession, fetchAiSessions } from "@/api/aiChat";
import AIChatSessionView from "@/components/AIChatSessionView";

export default function AIChatDashboard() {
  const [sessions, setSessions] = useState<AiSession[]>([]);
  const [selected, setSelected] = useState<AiSession | null>(null);

  const load = async () => {
    const data = await fetchAiSessions();
    setSessions(data);
  };

  useEffect(() => {
    void load();
    const interval = setInterval(() => {
      void load();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-full">
      <div className="w-1/3 overflow-auto border-r">
        <div className="border-b p-4 text-lg font-semibold">Active AI Sessions</div>
        {sessions.map((session) => (
          <div
            key={session.id}
            onClick={() => setSelected(session)}
            className={`cursor-pointer border-b p-4 hover:bg-gray-50 ${selected?.id === session.id ? "bg-gray-100" : ""}`}
          >
            <div className="font-medium">{session.companyName || "Unknown Company"}</div>
            <div className="text-xs text-gray-500">
              {session.fullName || "Visitor"} • {session.status}
            </div>
          </div>
        ))}
      </div>

      <div className="flex-1">
        {selected ? (
          <AIChatSessionView session={selected} />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">Select a session</div>
        )}
      </div>
    </div>
  );
}
