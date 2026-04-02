import { api } from "@/lib/api";
import { useCallback, useEffect, useMemo, useState } from "react";

type BiApplication = {
  id: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  annual_premium?: number | string;
  commission?: number | string;
  status?: string;
};

export default function BiApplications() {
  const [apps, setApps] = useState<BiApplication[]>([]);
  const [selected, setSelected] = useState<BiApplication | null>(null);

  const loadApps = useCallback(async (): Promise<BiApplication[]> => {
    const result = await api.get<BiApplication[]>("/api/applications");
    const nextApps = Array.isArray(result) ? result : [];
    setApps(nextApps);
    return nextApps;
  }, []);

  useEffect(() => {
    void loadApps();
  }, [loadApps]);

  const totalPremium = useMemo(() => apps.reduce((sum, a) => sum + Number(a.annual_premium || 0), 0), [apps]);

  const totalCommission = useMemo(() => apps.reduce((sum, a) => sum + Number(a.commission || 0), 0), [apps]);

  const updateStatus = async (id: number, status: string) => {
    const response = await api.patch(`/api/applications/${id}`, { status });
    if (!response) throw new Error("Update failed");

    const nextApps = await loadApps();
    setSelected(nextApps.find((app) => app.id === id) ?? null);
  };

  return (
    <div className="container">
      <h1>BI Applications</h1>

      <div className="summary-box">
        <div>
          <strong>Total Annual Premium:</strong>
          ${totalPremium.toLocaleString()}
        </div>
        <div>
          <strong>Total Commission (10%):</strong>
          ${totalCommission.toLocaleString()}
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Premium</th>
            <th>Commission</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {apps.map((a) => (
            <tr key={a.id} onClick={() => setSelected(a)}>
              <td>
                {a.first_name} {a.last_name}
              </td>
              <td>{a.email}</td>
              <td>${Number(a.annual_premium).toLocaleString()}</td>
              <td>${Number(a.commission).toLocaleString()}</td>
              <td>{a.status}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {selected && (
        <div className="detail-panel">
          <h2>Application Detail</h2>
          <pre>{JSON.stringify(selected, null, 2)}</pre>

          <div className="btn-row">
            <button onClick={() => void updateStatus(selected.id, "approved")}>Approve</button>
            <button onClick={() => void updateStatus(selected.id, "declined")}>Decline</button>
            <button onClick={() => void updateStatus(selected.id, "underwriting_review")}>Underwriting Review</button>
          </div>
        </div>
      )}
    </div>
  );
}
