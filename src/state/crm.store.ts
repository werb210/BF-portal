// BF_PORTAL_BLOCK_v158_DEAD_SILO_STORE_CLEANUP_v1
// Removed `silo` field. The active silo lives in BusinessUnitContext
// (SiloContext is a facade over it). Multiple sources of truth led
// to stale-value bugs where the CRM store stayed at "BF" after a
// silo switch and dead-code helpers fetched the wrong silo's data.
import { create } from "zustand";

type CrmFilters = {
  search: string;
  owner: string | null;
  hasActiveApplication: boolean;
};

type CrmState = {
  filters: CrmFilters;
  setFilters: (filters: Partial<CrmFilters>) => void;
  resetFilters: () => void;
};

const defaultFilters: CrmFilters = {
  search: "",
  owner: null,
  hasActiveApplication: false
};

export const useCrmStore = create<CrmState>((set) => ({
  filters: defaultFilters,
  setFilters: (filters) =>
    set((state) => ({ filters: { ...state.filters, ...filters } })),
  resetFilters: () => set({ filters: defaultFilters })
}));

export type { CrmFilters, CrmState };
