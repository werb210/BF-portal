import { useEffect, useState } from "react";
import { api } from "@/api";

interface Application {
  id: string;
  first_name: string;
  last_name: string;
  loan_amount: number;
  secured_type: "secured" | "unsecured";
  status: string;
  created_at: string;
}

export default function BiCommissions() {
  const [apps, setApps] = useState<Application[]>([]);
  const [totalAnnualPremium, setTotalAnnualPremium] = useState(0);
  const [totalCommission, setTotalCommission] = useState(0);

  useEffect(() => {
    api<Application[]>("/bi/applications")
      .then((data) => {
        const approved = data.filter((a: Application) => a.status === "approved");

        let premiumTotal = 0;

        approved.forEach((app: Application) => {
          const rate = app.secured_type === "secured" ? 0.016 : 0.04;
          premiumTotal += app.loan_amount * rate;
        });

        setTotalAnnualPremium(premiumTotal);
        setTotalCommission(premiumTotal * 0.1);
        setApps(approved);
      });
  }, []);

  return (
    <div>
      <h2>BI Recurring Commission Dashboard</h2>

      <div style={{ marginBottom: 30 }}>
        <h3>Total Annual Premiums: ${totalAnnualPremium.toLocaleString()}</h3>
        <h3>Your 10% Commission: ${totalCommission.toLocaleString()}</h3>
      </div>

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Loan</th>
            <th>Type</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {apps.map((app) => (
            <tr key={app.id}>
              <td>
                {app.first_name} {app.last_name}
              </td>
              <td>${app.loan_amount.toLocaleString()}</td>
              <td>{app.secured_type}</td>
              <td>{app.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
