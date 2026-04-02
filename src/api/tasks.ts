import { api } from "@/lib/api";

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
  const res = await api.getList<TaskItem>("/calendar/tasks");
  return res;
};

export const createTask = (task: Partial<TaskItem>) => api.post<TaskItem>("/calendar/tasks", task);

export const updateTask = (id: string, task: Partial<TaskItem>) => api.patch<TaskItem>(`/calendar/tasks/${id}`, task);

export const deleteTask = (id: string) => api.delete<void>(`/calendar/tasks/${id}`);
