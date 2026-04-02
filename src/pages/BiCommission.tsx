import { api } from "@/api";
import { useEffect, useState } from "react";

type LedgerRow = {
  id: string;
  application_id?: string;
  policy_year?: string | number;
  annual_premium?: string | number;
  commission?: string | number;
  renewal_date: string;
  paid?: boolean;
};

export default function BiCommission() {
  const [ledger, setLedger] = useState<LedgerRow[]>([]);

  useEffect(() => {
    api
      .get<LedgerRow[]>("/api/ledger")
      .then((result) => setLedger(Array.isArray(result) ? result : []));
  }, []);

  const totalCommission = ledger.reduce(
    (sum, l) => sum + Number(l.commission || 0),
    0
  );

  const upcomingRenewals = ledger.filter((l) => {
    const renewal = new Date(l.renewal_date);
    const now = new Date();
    const diff = (renewal.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 90;
  });

  return (
    <div className="container">
      <h1>BI Commission Dashboard</h1>

      <div className="summary-box">
        <div>
          <strong>Total Commission (All Years):</strong>
          ${totalCommission.toLocaleString()}
        </div>
        <div>
          <strong>Upcoming Renewals (90 Days):</strong>
          {upcomingRenewals.length}
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Application ID</th>
            <th>Policy Year</th>
            <th>Premium</th>
            <th>Commission</th>
            <th>Renewal Date</th>
            <th>Paid</th>
          </tr>
        </thead>
        <tbody>
          {ledger.map((l) => (
            <tr key={l.id}>
              <td>{l.application_id}</td>
              <td>{l.policy_year}</td>
              <td>${Number(l.annual_premium).toLocaleString()}</td>
              <td>${Number(l.commission).toLocaleString()}</td>
              <td>{new Date(l.renewal_date).toLocaleDateString()}</td>
              <td>{l.paid ? "Yes" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
