import { create } from "zustand";
const toggleStatus = (status) => (status === "done" ? "todo" : "done");
export const useTasksStore = create((set) => ({
    selectedTask: undefined,
    filters: { mine: false, createdByMe: false, overdue: false, silo: undefined },
    setSelectedTask: (task) => set({ selectedTask: task }),
    setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
    toggleCompletion: (task) => {
        const updated = { ...task, status: toggleStatus(task.status) };
        set({ selectedTask: updated });
        return updated;
    },
    setSilo: (silo) => set((state) => ({ filters: { ...state.filters, silo } }))
}));
