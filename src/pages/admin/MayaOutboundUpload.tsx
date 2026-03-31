import { useState } from "react";
import { apiRequest } from "@/lib/apiClient";

export default function MayaOutboundUpload() {

  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string>("");

  async function uploadFile() {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const json = await apiRequest<{ inserted: number }>("/admin/upload-leads", {
      method: "POST",
      data: formData,
      headers: { "Content-Type": "multipart/form-data" },
    });
    setMessage(`Inserted ${json.inserted} leads.`);
  }

  async function runOutbound() {
    const json = await apiRequest<{ callsTriggered: number }>("/admin/run-outbound", {
      method: "POST"
    });

    setMessage(`Triggered ${json.callsTriggered} outbound calls.`);
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Maya Outbound Upload</h1>

      <div className="space-y-4">
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />

        <button
          onClick={uploadFile}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Upload Excel
        </button>
      </div>

      <div>
        <button
          onClick={runOutbound}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Run Outbound Campaign
        </button>
      </div>

      {message && (
        <div className="mt-4 text-sm bg-gray-100 p-3 rounded">
          {message}
        </div>
      )}
    </div>
  );
}
