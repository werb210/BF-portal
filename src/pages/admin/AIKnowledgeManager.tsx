import { useEffect, useState } from "react";
import { AIService } from "@/services/aiService";

export default function AIKnowledgeManager() {
  const [items, setItems] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  async function load() {
    const res = await AIService.listKnowledge();
    const nextItems = Array.isArray(res) ? res : (res as { data?: any[] })?.data ?? [];
    setItems(nextItems);
  }

  async function save() {
    if (!title || !content) return;
    await AIService.createKnowledge({ title, content, sourceType: "portal" });
    setTitle("");
    setContent("");
    await load();
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">AI Knowledge Manager</h1>

      <div className="space-y-2">
        <input
          className="border p-2 w-full"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="border p-2 w-full h-40"
          placeholder="Content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <button
          onClick={() => void save()}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Save Knowledge
        </button>
      </div>

      <div>
        <h2 className="font-semibold mb-2">Existing Entries</h2>
        {items.map((item) => (
          <div key={item.id} className="border p-3 mb-2">
            <div className="font-bold">{item.title}</div>
            <div className="text-sm text-gray-600">{item.source_type}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
