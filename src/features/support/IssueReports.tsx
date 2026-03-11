import { useEffect, useState } from "react";
import { withApiBase } from "@/lib/apiBase";

type IssueReport = {
  id: string;
  description: string;
  screenshot?: string;
  crmRecordUrl?: string;
};

type IssueReportsProps = {
  isAdmin?: boolean;
};

function IssueReports({ isAdmin = true }: IssueReportsProps) {
  const [issues, setIssues] = useState<IssueReport[]>([]);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }
    void load();
  }, [isAdmin]);

  async function load() {
    const res = await fetch(withApiBase("/api/support/report"));
    const data = (await res.json()) as { issues?: IssueReport[] } | IssueReport[];
    setIssues(Array.isArray(data) ? data : (data.issues ?? []));
  }

  async function resolveIssue(id: string) {
    await fetch(withApiBase(`/api/support/report/${id}`), { method: "DELETE" });
    setIssues((prev) => prev.filter((issue) => issue.id !== id));
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Issue Reports</h2>
      <div className="space-y-4">
        {issues.map((issue) => (
          <div key={issue.id} className="rounded border border-slate-200 p-4">
            <p className="mb-2">
              <strong>Description:</strong> {issue.description}
            </p>
            {issue.crmRecordUrl ? (
              <p className="mb-2 text-sm">
                <a href={issue.crmRecordUrl} target="_blank" rel="noreferrer" className="text-blue-700 underline">
                  Open CRM record
                </a>
              </p>
            ) : null}
            {issue.screenshot ? (
              <img src={issue.screenshot} alt="Reported issue screenshot" className="mb-3 max-h-64 rounded object-contain" />
            ) : null}
            <button onClick={() => resolveIssue(issue.id)} className="rounded bg-emerald-600 px-3 py-1 text-white">
              Mark Resolved
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default IssueReports;
export { IssueReports };
