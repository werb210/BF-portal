import { apiClient } from "./httpClient";

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
  const res = await apiClient.getList<TaskItem>("/calendar/tasks");
  return res.items;
};

export const createTask = (task: Partial<TaskItem>) => apiClient.post<TaskItem>("/calendar/tasks", task);

export const updateTask = (id: string, task: Partial<TaskItem>) => apiClient.patch<TaskItem>(`/calendar/tasks/${id}`, task);

export const deleteTask = (id: string) => apiClient.delete<void>(`/calendar/tasks/${id}`);
