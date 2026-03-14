import { useState } from "react";
import { apiClient } from "@/api/apiClient";

export default function AiKnowledgeUpload() {
  const [file, setFile] = useState<File | null>(null);

  async function upload() {
    if (!file) return;

    const form = new FormData();
    form.append("file", file);

    await apiClient.post("/ai/admin/upload", form);
    alert("Uploaded and ingested.");
  }

  return (
    <div className="p-6">
      <h1 className="mb-4 text-xl font-semibold">Upload Product Sheet</h1>

      <input type="file" accept=".pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />

      <button onClick={() => void upload()} className="ml-3 rounded bg-black px-4 py-2 text-white">
        Upload
      </button>
    </div>
  );
}
