import { useEffect, useState } from "react";
import { api } from "@/api";

export function BankingAnalysisTab({ applicationId }: { applicationId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!applicationId) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    api(`/api/applications/${applicationId}/banking-analysis`)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [applicationId]);

  if (loading) return <div style={{ padding: 32, color: "#6b7280" }}>Loading banking analysis...</div>;
  if (!data) {
    return (
      <div style={{ padding: 32, color: "#6b7280" }}>
        No banking analysis available yet. Documents must be uploaded and processed first.
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 28px" }}>
      <h3 style={{ marginBottom: 16 }}>Banking Analysis</h3>
      <pre style={{ background: "#f9fafb", padding: 16, borderRadius: 8, fontSize: 12, overflow: "auto" }}>
        {JSON.stringify(data, null, 2)}
      </pre>
      {/* TODO: Replace pre with structured Banking Analysis UI from SYSTEM_CONTRACT Section 5.2 */}
    </div>
  );
}
