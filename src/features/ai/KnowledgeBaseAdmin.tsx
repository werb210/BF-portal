import { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";

type KnowledgeEntry = {
  id: string;
  content: string;
};

type KnowledgeBaseAdminProps = {
  isAdmin: boolean;
};

export function KnowledgeBaseAdmin({ isAdmin }: KnowledgeBaseAdminProps) {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [content, setContent] = useState("");

  async function load() {
    const data = await apiClient<KnowledgeEntry[]>("/api/ai/admin");
    setEntries(data);
  }

  async function addEntry() {
    if (!content.trim()) return;

    await apiClient('/api/ai/admin', {
      method: 'POST',
      data: { content },
    });
    setContent("");
    await load();
  }

  useEffect(() => {
    if (!isAdmin) return;
    void load();
  }, [isAdmin]);

  if (!isAdmin) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">AI Knowledge Base</h2>

      <textarea
        className="w-full min-h-32 rounded border border-slate-300 p-2"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Upload product spec, underwriting details, FAQs..."
      />

      <button className="rounded bg-slate-900 px-4 py-2 text-white" onClick={() => void addEntry()}>
        Add
      </button>

      <ul className="space-y-2">
        {entries.map((entry) => (
          <li key={entry.id} className="rounded border border-slate-200 p-2 text-sm">
            {entry.content.substring(0, 80)}...
          </li>
        ))}
      </ul>
    </div>
  );
}
