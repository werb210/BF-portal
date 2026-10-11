import { useEffect, useState } from "react";
import api from "@/api";
import { logger } from "@/utils/logger";

type KnowledgeFile = {
  id: string;
  name: string;
  embedStatus?: string;
  lastEmbeddedAt?: string | null;
};

function describe(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message && error.message !== "API_ERROR") return `${fallback}: ${error.message}`;
  return `${fallback}.`;
}

export default function AIKnowledgeBasePage() {
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [file, setFile] = useState<File | null>(null);
  // BF_PORTAL_AI_KB_v784 - failures were only logged; show them on the page.
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get("/api/admin/ai-documents")
      .then((res) => {
        setFiles(Array.isArray(res) ? res : []);
      })
      .catch((error) => {
        logger.error("Failed to load AI documents", { error });
        setFiles([]);
        setError(describe(error, "Could not load documents"));
      });
  }, []);

  async function upload() {
    if (!file) {
      setError("Choose a file to upload.");
      return;
    }
    setError(null);
    // Multipart upload; the server reads the "file" field.
    const formData = new FormData();
    formData.append("file", file, file.name);
    try {
      await api.post("/api/admin/ai-documents", formData);
      window.location.reload();
    } catch (error) {
      logger.error("Failed to upload AI document", { error });
      setError(describe(error, "Upload failed"));
    }
  }

  async function remove(id: string) {
    try {
      await api.delete(`/api/admin/ai-documents/${id}`);
      window.location.reload();
    } catch (error) {
      logger.error("Failed to delete AI document", { error });
      setError(describe(error, "Delete failed"));
    }
  }

  return (
    <div className="p-6 space-y-6" style={{ color: "var(--ui-text)" }}>
      <h1 className="text-2xl font-bold">AI Knowledge Base</h1>

      <div className="space-y-4">
        <input aria-label="Document file" type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <button type="button" onClick={() => void upload()} className="bg-blue-700 text-white px-4 py-2 rounded">
          Upload Document
        </button>
      </div>

      {error ? (
        <p role="alert" className="rounded px-3 py-2" style={{ color: "#B91C1C", background: "#FEF2F2", margin: 0 }}>
          {error}
        </p>
      ) : null}

      <div className="rounded shadow" style={{ background: "var(--ui-surface-strong)", color: "var(--ui-text)" }}>
        {files.map((entry) => (
          <div key={entry.id} className="p-3 border-t flex justify-between" style={{ borderColor: "var(--ui-border)" }}>
            <div>
              <div>{entry.name}</div>
              <div className="text-xs" style={{ color: "var(--ui-text-muted)" }}>
                Embed status: {entry.embedStatus ?? "Pending"}
                {entry.lastEmbeddedAt ? ` · Last embedded ${new Date(entry.lastEmbeddedAt).toLocaleString()}` : ""}
              </div>
            </div>
            <button onClick={() => void remove(entry.id)} className="font-semibold rounded px-2" style={{ color: "#B91C1C", background: "#FEF2F2" }}>
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
