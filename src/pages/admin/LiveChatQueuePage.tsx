import { useEffect, useState } from "react";
import api from "@/api";

type LiveChat = {
  id?: string;
  name?: string;
  email?: string;
  lastMessage?: string;
};

export default function LiveChatQueuePage() {
  const [chats, setChats] = useState<LiveChat[]>([]);

  useEffect(() => {
    api.get("/api/admin/live-chat-queue").then((res) => {
      setChats(Array.isArray(res) ? res : []);
    });
  }, []);

  return (
    <div className="p-6 text-ui-text">
      <h1 className="text-2xl font-bold mb-6">Live Chat Queue</h1>

      {chats.map((chat, i) => (
        // BF_PORTAL_v789_CONTRAST - theme surface and text tokens (was bg-white with inherited light text in dark mode).
        <div key={chat.id ?? i} className="bg-ui-surface text-ui-text border border-card shadow rounded p-4 mb-4">
          <div className="font-semibold">{chat.name}</div>
          <div className="text-sm text-ui-muted">{chat.email}</div>
          <div className="mt-2">{chat.lastMessage}</div>
        </div>
      ))}
    </div>
  );
}
