import { useEffect, useState } from "react";
import { apiClient } from "@/api/apiClient";
import AISessionList from "./AISessionList";

type Conversation = {
  id: string;
  created_at: string;
  user_name?: string;
  type?: string;
};

const filters = ["All", "Live Chat", "Credit Readiness", "AI Sessions"] as const;

type Filter = (typeof filters)[number];

export default function AiConversations() {
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<Filter>("All");


  useEffect(() => {
    apiClient.get("/chat/sessions").then((res) => {
      setConvos(Array.isArray(res.data) ? res.data : []);
    });
  }, []);

  const visibleConversations = convos.filter((conversation) => {
    if (selectedFilter === "All") return true;
    if (selectedFilter === "Live Chat") return conversation.type === "live_chat";
    if (selectedFilter === "Credit Readiness") return conversation.type === "credit_readiness";
    return false;
  });

  return (
    <div className="p-6">
      <h1 className="mb-4 text-xl font-semibold">AI Conversations</h1>
      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map((filter) => (
          <button
            key={filter}
            className={`rounded px-3 py-1 text-sm ${
              selectedFilter === filter ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"
            }`}
            onClick={() => setSelectedFilter(filter)}
          >
            {filter}
          </button>
        ))}
      </div>

      {selectedFilter === "AI Sessions" && <AISessionList />}

      {selectedFilter !== "AI Sessions" && (
        <div className="space-y-3">
          {visibleConversations.map((c) => (
            <div key={c.id} className="rounded border p-3">
              <div>ID: {c.id}</div>
              <div>Date: {new Date(c.created_at).toLocaleString()}</div>
              <div>User: {c.user_name || "Unknown"}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
