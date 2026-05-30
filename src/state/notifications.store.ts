import { create } from "zustand";
import type { NotificationItem } from "@/types/notifications";

const MAX_NOTIFICATIONS = 50;

type NotificationsState = {
  notifications: NotificationItem[];
  toast: NotificationItem | null;
  // BF_PORTAL_BLOCK_v637_INAPP_MSG_ALERTS_v1 — live unread total for the
  // Communications nav badge, kept in sync by useInboundMessageWatcher.
  messagesUnread: number;
  setMessagesUnread: (n: number) => void;
  addNotification: (notification: NotificationItem) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
  clearToast: () => void;
};

export const useNotificationsStore = create<NotificationsState>((set) => ({
  notifications: [],
  toast: null,
  messagesUnread: 0,
  setMessagesUnread: (n) => set({ messagesUnread: n }),
  addNotification: (notification) =>
    set((state) => {
      const nextNotifications = [notification, ...state.notifications].slice(0, MAX_NOTIFICATIONS);
      return {
        notifications: nextNotifications,
        toast: notification
      };
    }),
  markRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((item) =>
        item.id === id
          ? {
              ...item,
              read: true
            }
          : item
      )
    })),
  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((item) => ({ ...item, read: true }))
    })),
  clearAll: () => set({ notifications: [], toast: null }),
  clearToast: () => set({ toast: null })
}));
