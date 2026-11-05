// BF_PORTAL_v871_CALL_SCRIPTS - BF-Server /api/call-scripts: call scripts (playbooks), ported from KS-Portal #41.
// Every call carries the topbar silo (X-Silo), so BF, BI and SLF each see their own scripts.
import { api } from "@/api";

export type QuestionType = "text" | "long_text" | "number" | "money" | "date" | "yes_no" | "single_select" | "multi_select";
export type Question = {
  id: string; label: string; type: QuestionType; options: string[]; required: boolean; help: string;
  maps_to: { object: "contact" | "application"; field: string } | null;
};
export type Section = { id: string; title: string; body: string; questions: Question[] };
export type Script = { id: string; silo?: string; name: string; description: string | null; use_for: string; sections: Section[]; position: number; archived_at: string | null;
  /** BF_PORTAL_v891_ONE_CALL_SCRIPT - the script the dialler opens first (one per silo). */
  dialer_default?: boolean };
export type Run = {
  id: string; script_id: string; script_name: string; sections: Section[]; contact_id: string | null; application_id: string | null;
  answers: { [id: string]: unknown }; status: "in_progress" | "completed"; field_updates: Array<{ object: string; field: string }>;
  field_errors: Array<{ object: string; field: string; error: string }>; user_name: string | null; created_at: string; completed_at: string | null;
};
export type ScriptsList = {
  silo?: string; scripts: Script[]; question_types: Array<{ value: QuestionType; label: string }>;
  custom_fields: { [object: string]: Array<{ name: string; label: string; field_type: string }> };
};
export type RunTarget = { contact_id?: string | null; application_id?: string | null; call_sid?: string | null };

export const callScriptsApi = {
  list: (includeArchived = false) => api.get<ScriptsList>("/api/call-scripts", includeArchived ? { params: { include_archived: 1 } } : undefined),
  create: (body: unknown) => api.post<{ script: Script }>("/api/call-scripts", body),
  update: (id: string, body: unknown) => api.put<{ script: Script }>(`/api/call-scripts/${id}`, body),
  action: (id: string, action: "archive" | "unarchive" | "duplicate") => api.post<{ script: Script }>(`/api/call-scripts/${id}/${action}`, {}),
  starters: () => api.post<{ added: string[] }>("/api/call-scripts/starters", {}),
  runs: (target: RunTarget) => api.get<{ runs: Run[] }>("/api/call-scripts/runs", { params: target.application_id ? { application_id: target.application_id } : { contact_id: target.contact_id ?? "" } }),
  start: (body: RunTarget & { script_id: string; answers: unknown; finish?: boolean }) => api.post<{ run: Run }>("/api/call-scripts/runs", body),
  save: (id: string, answers: unknown, finish = false) => api.put<{ run: Run }>(`/api/call-scripts/runs/${id}`, { answers, finish }),
};

export function answerText(q: Question, v: unknown): string {
  if (v === undefined || v === null || v === "") return "";
  if (q.type === "yes_no") return v === true ? "Yes" : "No";
  if (q.type === "money") return Number(v).toLocaleString("en-CA", { style: "currency", currency: "CAD" });
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}
