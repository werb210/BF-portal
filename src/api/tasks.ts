import { api } from "@/api";
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
  const res = await api.getList<TaskItem>("/api/tasks");
  return res;
};

export const createTask = (task: Partial<TaskItem>) => api.post<TaskItem>("/api/tasks", task);

export const updateTask = (id: string, task: Partial<TaskItem>) => api.patch<TaskItem>(`/api/tasks/${id}`, task);

export const deleteTask = (id: string) => api.delete<void>(`/api/tasks/${id}`);
