import { create } from "zustand";
import type { AdPlatform } from "@/api/marketing.ads";

export type MarketingTodo = {
  id: string;
  title: string;
  assignedTo?: string;
  completed: boolean;
};

type MarketingState = {
  platformFilter?: AdPlatform | "All";
  silo?: string;
  dateRange: string;
  todos: MarketingTodo[];
  addTodo: (todo: Omit<MarketingTodo, "id" | "completed">) => MarketingTodo;
  toggleTodo: (id: string) => void;
  setDateRange: (range: string) => void;
  setPlatformFilter: (platform?: AdPlatform | "All") => void;
  setSilo: (silo?: string) => void;
};

let todoSequence = 3;

export const useMarketingStore = create<MarketingState>((set) => ({
  platformFilter: "All",
  silo: undefined,
  dateRange: "Last 30 days",
  todos: [
    { id: "todo-1", title: "Fix underperforming ads", completed: false, assignedTo: "Alex" },
    { id: "todo-2", title: "Increase budget for healthcare", completed: false, assignedTo: "Brooke" }
  ],
  addTodo: (todo) => {
    todoSequence += 1;
    const newTodo: MarketingTodo = { id: `todo-${todoSequence}`, completed: false, ...todo };
    set((state) => ({ todos: [newTodo, ...state.todos] }));
    return newTodo;
  },
  toggleTodo: (id) => set((state) => ({ todos: state.todos.map((todo) => (todo.id === id ? { ...todo, completed: !todo.completed } : todo)) })),
  setDateRange: (range) => set({ dateRange: range }),
  setPlatformFilter: (platform) => set({ platformFilter: platform }),
  setSilo: (silo) => set({ silo })
}));
