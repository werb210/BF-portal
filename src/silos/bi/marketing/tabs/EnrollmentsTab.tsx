// BF_PORTAL_BLOCK_BI_ROUND8_MARKETING_UI_v1
import { useEffect, useState } from "react";
import { api } from "@/api";

type Enrollment = {
  id: string;
  sequence_name: string;
  contact_name: string;
  contact_email: string | null;
  status: "active" | "paused" | "completed" | "stopped";
  current_step: number;
  paused_reason: string | null;
  next_step_at: string | null;
  started_at: string;
};

const STATUS_CLASS: Record<Enrollment["status"], string> = {
  active:    "bg-emerald-500/20 text-emerald-200",
  paused:    "bg-amber-500/20 text-amber-200",
  completed: "bg-sky-500/20 text-sky-200",
  stopped:   "bg-slate-500/20 text-slate-300",
};

export default function EnrollmentsTab() {
  const [list, setList] = useState<Enrollment[]>([]);
  const [statusFilter, setStatusFilter] = useState("");

  const load = async () => {
    const qs = statusFilter ? `?status=${statusFilter}` : "";
    try {
      const r = await api<{ enrollments: Enrollment[] }>(`/api/v1/bi/marketing/enrollments${qs}`);
      setList(r.enrollments || []);
    } catch {
      setList([]);
    }
  };
  useEffect(() => { void load(); }, [statusFilter]);

  const stop = async (id: string) => {
    if (!confirm("Stop this enrollment? Cannot be resumed.")) return;
    try {
      await api(`/api/v1/bi/marketing/enrollments/${id}`, { method: "PATCH", body: JSON.stringify({ status: "stopped" }) });
      void load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Stop failed");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-medium">Enrollments</h3>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded border border-card bg-brand-surface px-2 py-1 text-sm text-white">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="completed">Completed</option>
          <option value="stopped">Stopped</option>
        </select>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-white/50 text-xs">
            <th className="py-2">Contact</th>
            <th>Sequence</th>
            <th>Status</th>
            <th>Step</th>
            <th>Next</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {list.map((e) => (
            <tr key={e.id} className="border-t border-card">
              <td className="py-2">
                <div>{e.contact_name}</div>
                <div className="text-[10px] text-white/40">{e.contact_email}</div>
              </td>
              <td>{e.sequence_name}</td>
              <td>
                <span className={"rounded px-2 py-0.5 text-[10px] " + STATUS_CLASS[e.status]}>
                  {e.status}{e.paused_reason ? `: ${e.paused_reason}` : ""}
                </span>
              </td>
              <td>{e.current_step}</td>
              <td className="text-xs text-white/60">{e.next_step_at ? new Date(e.next_step_at).toLocaleString() : "-"}</td>
              <td>
                {(e.status === "active" || e.status === "paused") && (
                  <button onClick={() => void stop(e.id)} className="text-xs text-rose-300 hover:text-rose-200">Stop</button>
                )}
              </td>
            </tr>
          ))}
          {list.length === 0 && (
            <tr><td colSpan={6} className="py-4 text-white/50 italic">No enrollments.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
