import { useEffect, useState } from "react";
import { getAIKnowledge } from "@api/support";
import { buildUrl } from "@/lib/api";

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
    const form = new FormData();
    form.append("file", file);

    await fetch (buildUrl("/ai/knowledge/upload"), {
      method: "POST",
      body: form
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
