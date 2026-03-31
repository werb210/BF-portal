import { useEffect, useState } from "react";
import api from "@/lib/api";

type IssueReport = {
  id?: string;
  description?: string;
  createdAt?: string;
  screenshotUrl?: string;
};

export default function IssueReportsPage() {
  const [reports, setReports] = useState<IssueReport[]>([]);

  useEffect(() => {
    api.get("/admin/issue-reports").then((res) => {
      setReports(res.data || []);
    });
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Reported Issues</h1>

      {reports.map((report, i) => (
        <div key={report.id ?? i} className="bg-white p-4 shadow rounded space-y-2">
          <div className="font-semibold">{report.description}</div>
          <div className="text-sm text-gray-500">
            {report.createdAt ? new Date(report.createdAt).toLocaleString() : "—"}
          </div>
          {report.screenshotUrl && <img src={report.screenshotUrl} className="max-w-md rounded border" alt="Issue screenshot" />}
        </div>
      ))}
    </div>
  );
}
