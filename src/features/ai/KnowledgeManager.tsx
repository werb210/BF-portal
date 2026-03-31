import { useEffect, useState } from "react";
import { getAIKnowledge } from "@/api/support";
import { apiRequest } from "@/api/client";

export default function KnowledgeManager() {
  const [docs, setDocs] = useState<any[]>([]);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    const data = await getAIKnowledge();
    setDocs(data.documents || []);
  }

  async function upload(file: File) {
    const payload = new FormData();
    payload.append("file", file);

    await apiRequest('/api/ai/knowledge', {
      method: 'POST',
      data: payload,
      headers: { "Content-Type": "multipart/form-data" },
    });

    void load();
  }

  return (
    <div>
      <h2>AI Knowledge Base</h2>

      <input
        type="file"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            void upload(file);
          }
        }}
      />

      <ul>
        {docs.map((d) => (
          <li key={d.id}>{d.filename}</li>
        ))}
      </ul>
    </div>
  );
}
