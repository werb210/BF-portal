import { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";

type LiveRequest = {
  id: string;
  source: string;
};

type LiveChatQueueProps = {
  isAdmin: boolean;
};

export function LiveChatQueue({ isAdmin }: LiveChatQueueProps) {
  const [requests, setRequests] = useState<LiveRequest[]>([]);

  async function load() {
    const data = await apiClient<LiveRequest[]>("/support/live");
    setRequests(data);
  }

  useEffect(() => {
    if (!isAdmin) return;
    void load();
    const interval = setInterval(() => {
      void load();
    }, 5000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  if (!isAdmin) return null;

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Live Chat Requests</h2>
      <div className="space-y-2">
        {requests.map((request) => (
          <div key={request.id} className="chat-request flex items-center justify-between rounded border border-slate-200 p-3">
            <strong>{request.source}</strong>
            <button className="rounded border border-slate-300 px-3 py-1" onClick={() => (() => { throw new Error("Open chat window"); })()}>
              Join Chat
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
