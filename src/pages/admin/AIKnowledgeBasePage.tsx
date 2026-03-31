import { useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { logger } from "@/utils/logger";

type KnowledgeFile = {
  id: string;
  name: string;
  embedStatus?: string;
  lastEmbeddedAt?: string | null;
};

export default function AIKnowledgeBasePage() {
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    api
      .get("/admin/ai-documents")
      .then((res) => {
        setFiles(Array.isArray(res) ? res : []);
      })
      .catch((error) => {
        logger.error("Failed to load AI documents", { error });
        setFiles([]);
      });
  }, []);

  async function upload() {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      await api.post("/admin/ai-documents", formData);
      window.location.reload();
    } catch (error) {
      logger.error("Failed to upload AI document", { error });
    }
  }

  async function remove(id: string) {
    try {
      await api.delete(`/admin/ai-documents/${id}`);
      window.location.reload();
    } catch (error) {
      logger.error("Failed to delete AI document", { error });
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">AI Knowledge Base</h1>

      <div className="space-y-4">
        <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <button onClick={() => void upload()} className="bg-blue-600 text-white px-4 py-2 rounded">
          Upload Document
        </button>
      </div>

      <div className="bg-white rounded shadow">
        {files.map((entry) => (
          <div key={entry.id} className="p-3 border-t flex justify-between">
            <div>
              <div>{entry.name}</div>
              <div className="text-xs text-slate-500">
                Embed status: {entry.embedStatus ?? "Pending"}
                {entry.lastEmbeddedAt ? ` · Last embedded ${new Date(entry.lastEmbeddedAt).toLocaleString()}` : ""}
              </div>
            </div>
            <button onClick={() => void remove(entry.id)} className="text-red-500">
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
