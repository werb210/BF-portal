import { create } from "zustand";
export const useApiNotificationsStore = create((set) => ({
    toast: null,
    setToast: (toast) => set({ toast })
}));
export const showApiToast = (message, requestId) => {
    useApiNotificationsStore.setState({ toast: { message, requestId } });
};
export const clearApiToast = () => {
    useApiNotificationsStore.setState({ toast: null });
};
