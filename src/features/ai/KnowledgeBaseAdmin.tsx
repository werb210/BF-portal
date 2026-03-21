import { useEffect, useState } from "react";
import { buildUrl } from "@/lib/api";

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
    const res = await fetch(buildUrl("/api/ai/knowledge"));
    const data = (await res.json()) as KnowledgeEntry[];
    setEntries(data);
  }

  async function addEntry() {
    if (!content.trim()) return;

    await fetch(buildUrl("/api/ai/knowledge"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content })
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
