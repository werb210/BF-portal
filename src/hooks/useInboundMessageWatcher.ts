// BF_PORTAL_BLOCK_v637_INAPP_MSG_ALERTS_v1
// Global watcher: polls the staff message list and, when a new inbound client
// message arrives, raises an in-app notification (badge + toast via the
// notifications store) and plays a sound. Mounted once in AppLayout so staff
// are alerted anywhere in the portal — no SMS required. Uses total unread as
// the trigger (server-truth: opening a thread marks it read, which lowers the
// count on the next poll).
import { useEffect, useRef } from "react";
import { api } from "@/api";
import { useNotificationsStore } from "@/state/notifications.store";
import { useNotificationAudio } from "@/hooks/useNotificationAudio";

type ListRow = {
  contact_id?: string | null;
  thread_key?: string | null;
  display_name?: string | null;
  phone?: string | null;
  last_at?: string | null;
  last_body?: string | null;
  unread_count?: number | null;
};

const POLL_MS = 8000;

export function useInboundMessageWatcher() {
  const addNotification = useNotificationsStore((s) => s.addNotification);
  const setMessagesUnread = useNotificationsStore((s) => s.setMessagesUnread);
  const { playNotificationSound } = useNotificationAudio();
  const prevUnreadRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const poll = async () => {
      try {
        const r = await api<{ conversations?: ListRow[] }>(
          "/api/communications/messages-list",
          { params: { mode: "all" } },
        );
        if (cancelled) return;
        const rows = Array.isArray(r.conversations) ? r.conversations : [];
        const total = rows.reduce((sum, row) => sum + Number(row.unread_count ?? 0), 0);
        setMessagesUnread(total);

        const prev = prevUnreadRef.current;
        // Skip the first poll (baseline); only alert on an increase.
        if (prev !== null && total > prev) {
          const newest = rows
            .filter((row) => Number(row.unread_count ?? 0) > 0)
            .sort((a, b) => {
              const ta = a.last_at ? new Date(a.last_at).getTime() : 0;
              const tb = b.last_at ? new Date(b.last_at).getTime() : 0;
              return tb - ta;
            })[0];
          const who = newest?.display_name || newest?.phone || "New message";
          const body = (newest?.last_body || "You have a new message.").slice(0, 140);
          addNotification({
            id: `msg-${Date.now()}`,
            type: "new_message",
            title: who,
            message: body,
            createdAt: Date.now(),
            read: false,
            url: "/communications",
            source: "in_app",
          });
          playNotificationSound({ force: true });
        }
        prevUnreadRef.current = total;
      } catch {
        /* ignore transient poll errors */
      }
    };

    void poll();
    timer = setInterval(() => void poll(), POLL_MS);
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [addNotification, setMessagesUnread, playNotificationSound]);
}

export default useInboundMessageWatcher;
