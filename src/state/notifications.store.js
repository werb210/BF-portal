import { create } from "zustand";
const MAX_NOTIFICATIONS = 50;
export const useNotificationsStore = create((set) => ({
    notifications: [],
    toast: null,
    addNotification: (notification) => set((state) => {
        const nextNotifications = [notification, ...state.notifications].slice(0, MAX_NOTIFICATIONS);
        return {
            notifications: nextNotifications,
            toast: notification
        };
    }),
    markRead: (id) => set((state) => ({
        notifications: state.notifications.map((item) => item.id === id
            ? {
                ...item,
                read: true
            }
            : item)
    })),
    markAllRead: () => set((state) => ({
        notifications: state.notifications.map((item) => ({ ...item, read: true }))
    })),
    clearAll: () => set({ notifications: [], toast: null }),
    clearToast: () => set({ toast: null })
}));
