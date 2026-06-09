import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api";
import { useNotificationsStore } from "@/state/notifications.store";
import type { NotificationItem } from "@/types/notifications";
import { getNotificationLabel } from "@/utils/notifications";

const formatTimestamp = (timestamp: number) =>
  new Date(timestamp).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });

type NotificationCenterProps = {
  onClose: () => void;
};

const NotificationRow = ({ item, onMarkRead }: { item: NotificationItem; onMarkRead: () => void }) => (
  <button
    type="button"
    className={`flex w-full flex-col gap-1 rounded border px-3 py-2 text-left text-sm transition ${
      item.read ? "border-slate-200 bg-white" : "border-emerald-200 bg-emerald-50"
    }`}
    onClick={onMarkRead}
  >
    <div className="flex items-center justify-between gap-2">
      <span className="font-semibold text-slate-900">{item.title || getNotificationLabel(item.type)}</span>
      <span className="text-xs text-slate-500">{formatTimestamp(item.createdAt)}</span>
    </div>
    <span className="text-slate-600">{item.message}</span>
    <span className="text-xs text-slate-400">Source: {item.source}</span>
  </button>
);

const NotificationCenter = ({ onClose }: NotificationCenterProps) => {
  const { notifications, markAllRead, clearAll, markRead } = useNotificationsStore();
  const navigate = useNavigate();
  const unreadCount = useMemo(() => notifications.filter((item) => !item.read).length, [notifications]);

  // BF_PORTAL_BLOCK_v798_SERVER_NOTIFICATIONS — clicking a row marks it read (persisting
  // to the server for server-sourced items) and follows its link if one is set.
  const activate = (item: NotificationItem) => {
    markRead(item.id);
    if (item.source === "server") {
      void api.post(`/api/notifications/${encodeURIComponent(item.id)}/read`).catch(() => {});
    }
    if (item.url) {
      onClose();
      navigate(item.url);
    }
  };

  const handleMarkAll = () => {
    markAllRead();
    void api.post("/api/notifications/read-all").catch(() => {});
  };

  return (
    <div className="absolute right-0 top-full z-50 mt-2 w-96 rounded border border-slate-200 bg-white shadow-lg">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">Notifications</div>
          <div className="text-xs text-slate-500">{unreadCount} unread</div>
        </div>
        <button
          type="button"
          className="text-xs text-slate-500 hover:text-slate-700"
          onClick={onClose}
        >
          Close
        </button>
      </div>
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2 text-xs text-slate-500">
        <button type="button" className="hover:text-slate-700" onClick={handleMarkAll}>
          Mark all read
        </button>
        <button type="button" className="hover:text-slate-700" onClick={clearAll}>
          Clear
        </button>
      </div>
      <div className="max-h-96 space-y-2 overflow-auto px-4 py-3">
        {notifications.length === 0 ? (
          <p className="text-sm text-slate-500">No notifications yet.</p>
        ) : (
          notifications.map((item) => (
            <NotificationRow key={item.id} item={item} onMarkRead={() => activate(item)} />
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationCenter;
