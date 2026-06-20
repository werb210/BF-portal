import { useEffect, useState } from "react";
import { AIService } from "@/services/aiService";
import { api } from "@/api";

type KnowledgeItem = { id: string; title?: string; source_type?: string };

export default function AIKnowledgeManager() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [retraining, setRetraining] = useState(false);
  const [retrainMsg, setRetrainMsg] = useState<string | null>(null);

  async function load() {
    const res = await AIService.listKnowledge();
    if (Array.isArray(res)) {
      setItems(res as KnowledgeItem[]);
      return;
    }

    setItems((res as { data?: KnowledgeItem[] })?.data ?? []);
  }

  async function save() {
    if (!title || !content) return;
    await AIService.createKnowledge({ title, content, sourceType: "portal" });
    setTitle("");
    setContent("");
    await load();
  }

  async function retrainProducts() {
    setRetraining(true);
    setRetrainMsg(null);
    try {
      const res = await api.post<{ ok?: boolean; ingested?: number; deleted?: number }>(
        "/api/admin/reingest-products",
      );
      setRetrainMsg(`Maya retrained on ${res?.ingested ?? 0} products.`);
    } catch (e) {
      setRetrainMsg(e instanceof Error ? e.message : "Retrain failed");
    } finally {
      setRetraining(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">AI Knowledge Manager</h1>

      <div className="space-y-2">
        <input className="border p-2 w-full" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className="border p-2 w-full h-40" placeholder="Content" value={content} onChange={(e) => setContent(e.target.value)} />
        <button onClick={() => void save()} className="bg-blue-600 text-white px-4 py-2 rounded">
          Save Knowledge
        </button>
      </div>

      <div className="space-y-2 border-t pt-4">
        <h2 className="font-semibold">Maya product knowledge</h2>
        <p className="text-sm text-gray-600">
          Rebuild Maya&apos;s product embeddings from the current lender_products table. Run once after seeding or editing products.
        </p>
        <button
          onClick={() => void retrainProducts()}
          disabled={retraining}
          className="bg-emerald-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {retraining ? "Retraining…" : "Retrain Maya on products"}
        </button>
        {retrainMsg && <p className="text-sm text-gray-700">{retrainMsg}</p>}
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
