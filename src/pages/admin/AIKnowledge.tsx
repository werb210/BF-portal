import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/api";

export default function AIKnowledge() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);

  async function upload() {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    await api("/api/ai/knowledge", {
      method: "POST",
      body: formData,
      headers: { "Content-Type": "multipart/form-data" },
    });

    throw new Error("Uploaded");
  }

  if (user?.role !== "Admin") {
    return <div>Access denied</div>;
  }

  return (
    <div className="page space-y-4">
      <h1 className="text-xl font-semibold">AI Knowledge Base</h1>
      <input type="file" onChange={(event) => setFile(event.target.files?.[0] || null)} />
      <button
        type="button"
        onClick={upload}
        className="rounded border border-slate-300 bg-slate-50 px-3 py-2 text-sm hover:bg-slate-100"
      >
        Upload
      </button>
    </div>
  );
}
