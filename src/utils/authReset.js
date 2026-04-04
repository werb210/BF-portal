import { clearApiToast } from "@/state/apiNotifications";
import { useApiStatusStore } from "@/state/apiStatus";
import { useApplicationDrawerStore } from "@/state/applicationDrawer.store";
import { useCalendarStore } from "@/state/calendar.store";
import { useCommunicationsStore } from "@/state/communications.store";
import { useCrmStore } from "@/state/crm.store";
import { useMarketingStore } from "@/state/marketing.store";
import { useSettingsStore } from "@/state/settings.store";
import { useTasksStore } from "@/state/tasks.store";
import { clearLastApiRequest } from "@/state/apiClientTrace";
import { clearPortalDraft } from "@/utils/portalDraft";
import { resetRedirectTracking } from "@/utils/redirectGuard";
import { useDialerStore } from "@/state/dialer.store";
const resetCacheStorage = async () => {
    if (typeof caches === "undefined")
        return;
    try {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
    }
    catch {
        // ignore cache errors
    }
};
export const resetAuthState = async () => {
    clearApiToast();
    clearLastApiRequest();
    clearPortalDraft();
    resetRedirectTracking();
    useApiStatusStore.setState({ status: "starting" });
    useApplicationDrawerStore.setState({ isOpen: false, selectedApplicationId: null, selectedTab: "application" }, true);
    useCalendarStore.setState({ currentDate: new Date(), view: "week", meetingLinks: [] }, true);
    useCommunicationsStore.setState({
        conversations: [],
        selectedConversationId: undefined,
        loading: false,
        filters: { channel: "all", silo: "all", assigned: "all", search: "" }
    }, true);
    useCrmStore.setState({ silo: "BF", filters: { search: "", owner: null, hasActiveApplication: false } }, true);
    useMarketingStore.setState({
        platformFilter: "All",
        silo: undefined,
        dateRange: "Last 30 days",
        todos: [
            { id: "todo-1", title: "Fix underperforming ads", completed: false, assignedTo: "Alex" },
            { id: "todo-2", title: "Increase budget for healthcare", completed: false, assignedTo: "Brooke" }
        ]
    }, true);
    useSettingsStore.getState().reset();
    useTasksStore.setState({
        selectedTask: undefined,
        filters: { mine: false, createdByMe: false, overdue: false, silo: undefined }
    }, true);
    useDialerStore.setState({
        isOpen: false,
        isMinimized: false,
        context: {},
        status: "idle",
        muted: false,
        onHold: false,
        keypadOpen: false,
        number: "",
        dialedNumber: null,
        error: null,
        warning: null,
        failureReason: null,
        startedAt: null,
        elapsedSeconds: 0,
        logs: [],
        currentCallId: null,
        dialAttempts: []
    }, true);
    await resetCacheStorage();
};
