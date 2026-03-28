import { create } from "zustand";
import type { TaskItem, TaskStatus } from "@/api/tasks";

export type TaskFilters = {
  mine: boolean;
  createdByMe: boolean;
  overdue: boolean;
  silo?: string;
};

type TasksState = {
  selectedTask?: TaskItem;
  filters: TaskFilters;
  setSelectedTask: (task?: TaskItem) => void;
  setFilters: (filters: Partial<TaskFilters>) => void;
  toggleCompletion: (task: TaskItem) => TaskItem;
  setSilo: (silo?: string) => void;
};

const toggleStatus = (status: TaskStatus): TaskStatus => (status === "done" ? "todo" : "done");

export const useTasksStore = create<TasksState>((set) => ({
  selectedTask: undefined,
  filters: { mine: false, createdByMe: false, overdue: false, silo: undefined },
  setSelectedTask: (task) => set({ selectedTask: task }),
  setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
  toggleCompletion: (task) => {
    const updated: TaskItem = { ...task, status: toggleStatus(task.status) };
    set({ selectedTask: updated });
    return updated;
  },
  setSilo: (silo) => set((state) => ({ filters: { ...state.filters, silo } }))
}));
