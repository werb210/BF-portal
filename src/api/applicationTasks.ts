import { api, type RequestOptions } from "@/api";

export type ClientTask = { key: string; label: string; complete: boolean };
export type TaskStatus = {
  applicationId: string;
  tasks: ClientTask[];
  summary: { total: number; complete: number; outstanding: number; allComplete: boolean };
};

// BF_PORTAL_BLOCK_v783_TASK_STATUS — read-only client task completion for staff.
export const fetchTaskStatus = (applicationId: string, options?: RequestOptions) =>
  api.get<TaskStatus>(`/api/applications/${applicationId}/task-status`, options);
