import { useEffect, useState } from "react";
import {
  convertPreApplication,
  fetchPreApplications,
  type PreApplicationRecord,
} from "@api/preApplications";

export default function PreApplications() {
  const [data, setData] = useState<PreApplicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [convertingId, setConvertingId] = useState<string | null>(null);

  async function loadPreApplications() {
    const records = await fetchPreApplications();
    setData(records);
  }

  useEffect(() => {
    loadPreApplications().finally(() => setLoading(false));
  }, []);

  async function handleConvert(id: string) {
    setConvertingId(id);
    try {
      await convertPreApplication(id);
      await loadPreApplications();
    } finally {
      setConvertingId(null);
    }
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-semibold">Pre-Applications</h1>

      <div className="space-y-4">
        {data.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-slate-700 bg-slate-800 p-4"
          >
            <div className="flex justify-between">
              <div>
                <div className="font-medium">{item.companyName}</div>
                <div className="text-sm text-slate-400">
                  {item.fullName} • {item.email}
                </div>
                <div className="text-sm text-slate-400">
                  Revenue: {item.annualRevenue ?? "N/A"} | Requested:{" "}
                  {item.requestedAmount ?? "N/A"}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleConvert(item.id)}
                disabled={convertingId === item.id}
                className="rounded-lg bg-blue-600 px-4 py-2 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {convertingId === item.id ? "Converting..." : "Convert"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
