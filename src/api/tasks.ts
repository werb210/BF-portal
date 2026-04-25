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

export const fetchTasks = async () => {
  if (!getAuthToken()) throw new Error("Not authenticated");
  const msToken = await getMicrosoftAccessToken(msalClient);
  const res = await api.getList<TaskItem>("/api/tasks", {
    headers: msToken ? { "X-MS-Access-Token": msToken } : {},
  });
  return res;
};

export const createTask = async (task: Partial<TaskItem>) => {
  const msToken = await getMicrosoftAccessToken(msalClient);
  return api.post<TaskItem>("/api/tasks", task, {
    headers: msToken ? { "X-MS-Access-Token": msToken } : {},
  });
};

export const updateTask = async (id: string, task: Partial<TaskItem>) => {
  const msToken = await getMicrosoftAccessToken(msalClient);
  return api.patch<TaskItem>(`/api/tasks/${id}`, task, {
    headers: msToken ? { "X-MS-Access-Token": msToken } : {},
  });
};

export const deleteTask = async (id: string) => {
  const msToken = await getMicrosoftAccessToken(msalClient);
  return api.delete<void>(`/api/tasks/${id}`, {
    headers: msToken ? { "X-MS-Access-Token": msToken } : {},
  });
};
