import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type AiSession = {
  id: string;
  contactName?: string;
  createdAt: string;
};

export default function AISessionList() {
  const [sessions, setSessions] = useState<AiSession[]>([]);

  useEffect(() => {
    api.get<AiSession[]>("/portal/ai/sessions").then((res) => {
      setSessions(Array.isArray(res) ? res : []);
    });
  }, []);

  return (
    <div className="space-y-4 p-4">
      {sessions.map((s) => (
        <div key={s.id} className="rounded border p-3">
          <div className="text-sm font-medium">{s.contactName ?? "Unknown contact"}</div>
          <div className="text-xs text-neutral-500">{new Date(s.createdAt).toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
}
