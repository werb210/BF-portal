import { apiClient } from "@/api/client";
import { useEffect, useState } from "react";

export default function BiApplications() {
  const [apps, setApps] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    apiClient
      .get("/api/applications")
      .then((response) => setApps(response.data));
  }, []);

  const totalPremium = apps.reduce(
    (sum, a) => sum + Number(a.annual_premium || 0),
    0
  );

  const totalCommission = apps.reduce(
    (sum, a) => sum + Number(a.commission || 0),
    0
  );

  const updateStatus = async (id: number, status: string) => {
    await apiClient.patch(`/api/applications/${id}`, { status });

    setApps(apps.map((a) => (a.id === id ? { ...a, status } : a)));
    setSelected((current: any) =>
      current && current.id === id ? { ...current, status } : current
    );
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
            <button onClick={() => updateStatus(selected.id, "approved")}>
              Approve
            </button>
            <button onClick={() => updateStatus(selected.id, "declined")}>
              Decline
            </button>
            <button
              onClick={() =>
                updateStatus(selected.id, "underwriting_review")
              }
            >
              Underwriting Review
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
