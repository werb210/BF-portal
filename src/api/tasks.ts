// BF_PORTAL_BLOCK_76_TASKS_REPOINT_v1 - /api/tasks was a server stub;
// real DB-backed tasks live at /api/calendar/tasks (BF-Server
// src/routes/calendar.ts). Field names + priority/status enums differ;
// adapt both directions so the existing TaskItem shape callers depend on
// keeps working.
import { api } from "@/api";
import { getMicrosoftAccessToken } from "@/auth/microsoftToken";
import { msalClient } from "@/auth/msal";
import { getAuthToken } from "@/lib/authToken";

export type TaskStatus = "todo" | "in-progress" | "done";
export type TaskPriority = "low" | "medium" | "high";

export type TaskItem = {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  priority: TaskPriority;
  status: TaskStatus;
  assignedToUserId?: string;
  createdByUserId?: string;
  silo?: string;
  relatedApplicationId?: string;
  relatedContactId?: string;
};

type ServerTaskRow = {
  id: string;
  title: string;
  notes?: string | null;
  dueAt?: string | null;
  priority?: "low" | "normal" | "high";
  status?: "open" | "done";
  o365TaskId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string | null;
};

function fromServer(row: ServerTaskRow): TaskItem {
  const priority: TaskPriority =
    row.priority === "low" ? "low" : row.priority === "high" ? "high" : "medium";
  const status: TaskStatus = row.status === "done" ? "done" : "todo";
  return {
    id: row.id,
    title: row.title,
    description: row.notes ?? undefined,
    dueDate: row.dueAt ?? undefined,
    priority,
    status,
  };
}

function toServer(task: Partial<TaskItem>): Record<string, unknown> {
  const priority =
    task.priority === "low" ? "low" : task.priority === "high" ? "high" : "normal";
  const status = task.status === "done" ? "done" : "open";
  const body: Record<string, unknown> = {};
  if (task.title !== undefined) body.title = task.title;
  if (task.description !== undefined) body.notes = task.description;
  if (task.dueDate !== undefined) body.dueAt = task.dueDate;
  if (task.priority !== undefined) body.priority = priority;
  if (task.status !== undefined) body.status = status;
  return body;
}

export const fetchTasks = async () => {
  if (!getAuthToken()) throw new Error("Not authenticated");
  const msToken = await getMicrosoftAccessToken(msalClient);
  const rows = await api.get<ServerTaskRow[]>("/api/calendar/tasks", {
    headers: msToken ? { "X-MS-Access-Token": msToken } : {},
  });
  return (Array.isArray(rows) ? rows : []).map(fromServer);
};

export const createTask = async (task: Partial<TaskItem>) => {
  const msToken = await getMicrosoftAccessToken(msalClient);
  const row = await api.post<ServerTaskRow>("/api/calendar/tasks", toServer(task), {
    headers: msToken ? { "X-MS-Access-Token": msToken } : {},
  });
  return fromServer(row);
};

export const updateTask = async (id: string, task: Partial<TaskItem>) => {
  const msToken = await getMicrosoftAccessToken(msalClient);
  const row = await api.patch<ServerTaskRow>(`/api/calendar/tasks/${id}`, toServer(task), {
    headers: msToken ? { "X-MS-Access-Token": msToken } : {},
  });
  return fromServer(row);
};

export const deleteTask = async (id: string) => {
  const msToken = await getMicrosoftAccessToken(msalClient);
  return api.delete<void>(`/api/calendar/tasks/${id}`, {
    headers: msToken ? { "X-MS-Access-Token": msToken } : {},
  });
};
