import { create } from "zustand";
import type { PipelineFilters, PipelineStageId } from "./pipeline.types";
const STORAGE_KEY = "portal.application.pipeline";

type PipelinePersistedState = {
  selectedStageId?: PipelineStageId | null;
  selectedApplicationId?: string | null;
  filters?: PipelineFilters;
  isDrawerOpen?: boolean;
};

const readPipelineState = (): PipelinePersistedState => {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as PipelinePersistedState;
  } catch {
    return {};
  }
};

const writePipelineState = (draft: PipelinePersistedState) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
};

const persistPipelineState = (state: PipelineStoreState) => {
  writePipelineState({
    selectedStageId: state.selectedStageId,
    selectedApplicationId: state.selectedApplicationId,
    filters: state.currentFilters,
    isDrawerOpen: state.isDrawerOpen
  });
};

const clearPipelineState = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
};

export type PipelineStoreState = {
  selectedApplicationId: string | null;
  selectedStageId: PipelineStageId | null;
  isDrawerOpen: boolean;
  draggingCardId: string | null;
  draggingFromStage: PipelineStageId | null;
  currentFilters: PipelineFilters;
  selectedApplicationIds: string[];
};

const defaultFilters: PipelineFilters = {
  sort: "updated_desc"
};

const getInitialFilters = (): PipelineFilters => {
  const stored = readPipelineState().filters ?? {};
  return { ...defaultFilters, ...stored };
};

const getInitialStageId = (): PipelineStageId | null => readPipelineState().selectedStageId ?? null;

const getInitialSelectedApplicationId = (): string | null => readPipelineState().selectedApplicationId ?? null;

const getInitialDrawerState = (selectedApplicationId: string | null): boolean =>
  readPipelineState().isDrawerOpen ?? Boolean(selectedApplicationId);

export type PipelineStoreActions = {
  selectApplication: (id: string | null, stageId?: PipelineStageId) => void;
  setSelectedStageId: (stageId: PipelineStageId) => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  setDragging: (cardId: string | null, stageId: PipelineStageId | null) => void;
  setFilters: (filters: Partial<PipelineFilters>) => void;
  toggleSelection: (applicationId: string) => void;
  clearSelection: () => void;
  resetFilters: () => void;
  resetPipeline: () => void;
};

export type PipelineStore = PipelineStoreState & PipelineStoreActions;

export const usePipelineStore = create<PipelineStore>((set) => {
  const initialSelectedApplicationId = getInitialSelectedApplicationId();
  return {
    selectedApplicationId: initialSelectedApplicationId,
    selectedStageId: getInitialStageId(),
    isDrawerOpen: getInitialDrawerState(initialSelectedApplicationId),
    draggingCardId: null,
    draggingFromStage: null,
    currentFilters: getInitialFilters(),
    selectedApplicationIds: [],
    selectApplication: (id, stageId) =>
      set((state) => {
        const nextState = {
          ...state,
          selectedApplicationId: id,
          selectedStageId: stageId ?? state.selectedStageId,
          isDrawerOpen: Boolean(id)
        };
        persistPipelineState(nextState);
        return nextState;
      }),
    setSelectedStageId: (stageId) =>
      set((state) => {
        const nextState = { ...state, selectedStageId: stageId };
        persistPipelineState(nextState);
        return nextState;
      }),
    openDrawer: () =>
      set((state) => {
        const nextState = { ...state, isDrawerOpen: Boolean(state.selectedApplicationId) };
        persistPipelineState(nextState);
        return nextState;
      }),
    closeDrawer: () =>
      set((state) => {
        const nextState = { ...state, isDrawerOpen: false };
        persistPipelineState(nextState);
        return nextState;
      }),
    setDragging: (cardId, stageId) => set({ draggingCardId: cardId, draggingFromStage: stageId }),
    setFilters: (filters) =>
      set((state) => {
        const nextFilters = { ...state.currentFilters, ...filters };
        const categoryChanged =
          Object.prototype.hasOwnProperty.call(filters, "productCategory") &&
          filters.productCategory !== state.currentFilters.productCategory;
        const nextState = {
          ...state,
          currentFilters: nextFilters,
          selectedApplicationId: categoryChanged ? null : state.selectedApplicationId,
          isDrawerOpen: categoryChanged ? false : state.isDrawerOpen
        };
        persistPipelineState(nextState);
        return nextState;
      }),
    toggleSelection: (applicationId) =>
      set((state) => {
        const selected = state.selectedApplicationIds.includes(applicationId)
          ? state.selectedApplicationIds.filter((id) => id !== applicationId)
          : [...state.selectedApplicationIds, applicationId];
        return { ...state, selectedApplicationIds: selected };
      }),
    clearSelection: () => set((state) => ({ ...state, selectedApplicationIds: [] })),
    resetFilters: () =>
      set((state) => {
        const nextState = {
          ...state,
          currentFilters: { ...defaultFilters },
          selectedApplicationId: null,
          selectedStageId: null,
          isDrawerOpen: false,
          selectedApplicationIds: []
        };
        persistPipelineState(nextState);
        return nextState;
      }),
    resetPipeline: () => {
      clearPipelineState();
      set({
        selectedApplicationId: null,
        selectedStageId: null,
        isDrawerOpen: false,
        draggingCardId: null,
        draggingFromStage: null,
        currentFilters: { ...defaultFilters },
        selectedApplicationIds: []
      });
    }
  };
});

const filterKeyParts = (filters: PipelineFilters) => [
  filters.searchTerm ?? "",
  filters.productCategory ?? "",
  filters.stageId ?? "",
  filters.lenderAssigned ?? "",
  filters.lenderStatus ?? "",
  filters.processingStatus ?? "",
  filters.submissionMethod ?? "",
  filters.dateFrom ?? "",
  filters.dateTo ?? "",
  filters.sort ?? "updated_desc"
];

export const pipelineQueryKeys = {
  column: (stage: PipelineStageId, filters: PipelineFilters) => ["pipeline", stage, ...filterKeyParts(filters)],
  list: (filters: PipelineFilters) => ["pipeline", ...filterKeyParts(filters)]
};
