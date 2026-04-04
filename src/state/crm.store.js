import { create } from "zustand";
const defaultFilters = {
    search: "",
    owner: null,
    hasActiveApplication: false
};
export const useCrmStore = create((set) => ({
    silo: "BF",
    filters: defaultFilters,
    setSilo: (silo) => set({ silo }),
    setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
    resetFilters: () => set({ filters: defaultFilters })
}));
