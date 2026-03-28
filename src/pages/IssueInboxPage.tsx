import { useEffect, useState } from "react";
import { deleteIssue, fetchWebsiteIssues, resolveIssue } from "@/api/issues";

type Issue = {
  id: string;
  message: string;
  screenshot?: string;
  screenshotUrl?: string;
  createdAt?: string;
  resolved?: boolean;
  sessionId?: string;
};

export default function IssueInboxPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadIssues = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchWebsiteIssues();
        if (!mounted) return;
        setIssues(Array.isArray(data) ? data : []);
      } catch {
        if (!mounted) return;
        setError("Unable to load issues right now.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void loadIssues();
    return () => {
      mounted = false;
    };
  }, []);

  async function markResolved(id: string) {
    try {
      await resolveIssue(id);
      setIssues((previous) =>
        previous.map((issue) => (issue.id === id ? { ...issue, resolved: true } : issue))
      );
    } catch {
      setError("Unable to resolve this issue right now.");
    }
  }

  async function removeIssue(id: string) {
    try {
      await deleteIssue(id);
      setIssues((previous) => previous.filter((issue) => issue.id !== id));
    } catch {
      setError("Unable to delete this issue right now.");
    }
  }

  return (
    <div className="p-6">
      <h2 className="mb-4 font-semibold">Reported Issues</h2>
      {loading && <p className="text-sm text-slate-500">Loading issues…</p>}
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {issues.map((issue) => (
        <div key={issue.id} className="mb-4 border p-4">
          <div className="text-sm">{issue.message}</div>
          {issue.screenshot || issue.screenshotUrl ? (
            <img
              src={issue.screenshotUrl ?? issue.screenshot}
              className="mt-2 max-h-44 max-w-md border"
              alt="Issue screenshot"
            />
          ) : null}
          <div className="mt-2 text-xs text-slate-500">
            {issue.sessionId ?? issue.id}
            {issue.createdAt ? ` · ${new Date(issue.createdAt).toLocaleString()}` : ""}
          </div>
          <div className="mt-2 flex items-center gap-4">
            <button onClick={() => void markResolved(issue.id)} className="text-sm text-emerald-700" disabled={issue.resolved}>
              {issue.resolved ? "Resolved" : "Mark resolved"}
            </button>
            <button onClick={() => void removeIssue(issue.id)} className="text-sm text-red-600">
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
