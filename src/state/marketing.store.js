import { create } from "zustand";
let todoSequence = 3;
export const useMarketingStore = create((set) => ({
    platformFilter: "All",
    silo: undefined,
    dateRange: "Last 30 days",
    todos: [
        { id: "todo-1", title: "Fix underperforming ads", completed: false, assignedTo: "Alex" },
        { id: "todo-2", title: "Increase budget for healthcare", completed: false, assignedTo: "Brooke" }
    ],
    addTodo: (todo) => {
        todoSequence += 1;
        const newTodo = { id: `todo-${todoSequence}`, completed: false, ...todo };
        set((state) => ({ todos: [newTodo, ...state.todos] }));
        return newTodo;
    },
    toggleTodo: (id) => set((state) => ({ todos: state.todos.map((todo) => (todo.id === id ? { ...todo, completed: !todo.completed } : todo)) })),
    setDateRange: (range) => set({ dateRange: range }),
    setPlatformFilter: (platform) => set({ platformFilter: platform }),
    setSilo: (silo) => set({ silo })
}));
