import { useEffect, useState } from "react";
import api from "@/lib/api";

type LiveChat = {
  id?: string;
  name?: string;
  email?: string;
  lastMessage?: string;
};

export default function LiveChatQueuePage() {
  const [chats, setChats] = useState<LiveChat[]>([]);

  useEffect(() => {
    api.get("/admin/live-chat-queue").then((res) => {
      setChats(res.data || []);
    });
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Live Chat Queue</h1>

      {chats.map((chat, i) => (
        <div key={chat.id ?? i} className="bg-white shadow rounded p-4 mb-4">
          <div className="font-semibold">{chat.name}</div>
          <div className="text-sm text-gray-500">{chat.email}</div>
          <div className="mt-2">{chat.lastMessage}</div>
        </div>
      ))}
    </div>
  );
}
