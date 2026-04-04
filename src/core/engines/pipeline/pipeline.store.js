// @ts-nocheck
import { create } from "zustand";
const STORAGE_KEY = "portal.application.pipeline";
const readPipelineState = () => {
    if (typeof window === "undefined")
        return {};
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw)
        return {};
    try {
        return JSON.parse(raw);
    }
    catch {
        return {};
    }
};
const writePipelineState = (draft) => {
    if (typeof window === "undefined")
        return;
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
};
const persistPipelineState = (state) => {
    writePipelineState({
        selectedStageId: state.selectedStageId,
        selectedApplicationId: state.selectedApplicationId,
        filters: state.currentFilters,
        isDrawerOpen: state.isDrawerOpen
    });
};
const clearPipelineState = () => {
    if (typeof window === "undefined")
        return;
    window.sessionStorage.removeItem(STORAGE_KEY);
};
const defaultFilters = {
    sort: "updated_desc"
};
const getInitialFilters = () => {
    const stored = readPipelineState().filters ?? {};
    return { ...defaultFilters, ...stored };
};
const getInitialStageId = () => readPipelineState().selectedStageId ?? null;
const getInitialSelectedApplicationId = () => readPipelineState().selectedApplicationId ?? null;
const getInitialDrawerState = (selectedApplicationId) => readPipelineState().isDrawerOpen ?? Boolean(selectedApplicationId);
export const usePipelineStore = create((set) => {
    const initialSelectedApplicationId = getInitialSelectedApplicationId();
    return {
        selectedApplicationId: initialSelectedApplicationId,
        selectedStageId: getInitialStageId(),
        isDrawerOpen: getInitialDrawerState(initialSelectedApplicationId),
        draggingCardId: null,
        draggingFromStage: null,
        currentFilters: getInitialFilters(),
        selectedApplicationIds: [],
        selectApplication: (id, stageId) => set((state) => {
            const nextState = {
                ...state,
                selectedApplicationId: id,
                selectedStageId: stageId ?? state.selectedStageId,
                isDrawerOpen: Boolean(id)
            };
            persistPipelineState(nextState);
            return nextState;
        }),
        setSelectedStageId: (stageId) => set((state) => {
            const nextState = { ...state, selectedStageId: stageId };
            persistPipelineState(nextState);
            return nextState;
        }),
        openDrawer: () => set((state) => {
            const nextState = { ...state, isDrawerOpen: Boolean(state.selectedApplicationId) };
            persistPipelineState(nextState);
            return nextState;
        }),
        closeDrawer: () => set((state) => {
            const nextState = { ...state, isDrawerOpen: false };
            persistPipelineState(nextState);
            return nextState;
        }),
        setDragging: (cardId, stageId) => set({ draggingCardId: cardId, draggingFromStage: stageId }),
        setFilters: (filters) => set((state) => {
            const nextFilters = { ...state.currentFilters, ...filters };
            const categoryChanged = Object.prototype.hasOwnProperty.call(filters, "productCategory") &&
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
        toggleSelection: (applicationId) => set((state) => {
            const selected = state.selectedApplicationIds.includes(applicationId)
                ? state.selectedApplicationIds.filter((id) => id !== applicationId)
                : [...state.selectedApplicationIds, applicationId];
            return { ...state, selectedApplicationIds: selected };
        }),
        clearSelection: () => set((state) => ({ ...state, selectedApplicationIds: [] })),
        resetFilters: () => set((state) => {
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
const filterKeyParts = (filters) => [
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
    column: (stage, filters) => ["pipeline", stage, ...filterKeyParts(filters)],
    list: (filters) => ["pipeline", ...filterKeyParts(filters)]
};
