import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/api";

export default function ComparisonEditor() {
  const { user } = useAuth();
  const [data, setData] = useState<unknown>(null);

  async function load() {
    const json = await apiRequest<unknown>("/comparison");
    setData(json);
  }

  if (user?.role !== "Admin") {
    return <div>Access denied</div>;
  }

  return (
    <div className="page space-y-4">
      <h1 className="text-xl font-semibold">Comparison Editor</h1>
      <button
        type="button"
        onClick={load}
        className="rounded border border-slate-300 bg-slate-50 px-3 py-2 text-sm hover:bg-slate-100"
      >
        Load Comparison
      </button>
      {data !== null && (
        <pre className="overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}
