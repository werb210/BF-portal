import { api } from "@/api";
export const fetchTasks = async () => {
    const res = await api.getList("/calendar/tasks");
    return res;
};
export const createTask = (task) => api.post("/calendar/tasks", task);
export const updateTask = (id, task) => api.patch(`/calendar/tasks/${id}`, task);
export const deleteTask = (id) => api.delete(`/calendar/tasks/${id}`);
