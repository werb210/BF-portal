import { create } from "zustand";
import { readPortalDraft, updatePortalDraft } from "@/utils/portalDraft";
const defaultTab = () => readPortalDraft().drawerTab ?? "application";
export const useApplicationDrawerStore = create((set) => ({
    isOpen: false,
    selectedApplicationId: null,
    selectedTab: defaultTab(),
    open: (applicationId, tab) => set(() => ({
        isOpen: true,
        selectedApplicationId: applicationId,
        selectedTab: tab ?? defaultTab()
    })),
    close: () => set(() => ({ isOpen: false, selectedApplicationId: null })),
    setTab: (tab) => {
        updatePortalDraft({ drawerTab: tab });
        set(() => ({ selectedTab: tab }));
    }
}));
