// BF_PORTAL_BLOCK_v798_SERVER_NOTIFICATIONS — pulls the server notification feed
// (/api/notifications) into the topbar Notification Centre. Until now the centre only
// showed local push/in-app items, so server-side notifications (email-unopened follow-ups,
// @-mentions, etc.) never surfaced. Polls every 60s and merges by id (server read-state wins).
import { useEffect } from "react";
import { api } from "@/api";
import { useNotificationsStore } from "@/state/notifications.store";
import type { NotificationItem, NotificationType } from "@/types/notifications";

type ServerRow = {
  id: string;
  type: string;
  body: string | null;
  context_url: string | null;
  is_read: boolean;
  created_at: string;
};

const KNOWN = new Set<NotificationType>([
  "auth_alert",
  "document_requested",
  "lender_status",
  "system_alert",
  "new_message",
  "email_unopened"
]);

const mapType = (type: string): NotificationType => {
  if (KNOWN.has(type as NotificationType)) {
    return type as NotificationType;
  }
  return "system_alert";
};

const parseCreatedAt = (createdAt: string) => {
  const timestamp = createdAt ? new Date(createdAt).getTime() : Date.now();
  return Number.isFinite(timestamp) ? timestamp : Date.now();
};

export function useServerNotifications(pollMs = 60_000) {
  const mergeServer = useNotificationsStore((state) => state.mergeServer);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        const response = await api<{ items?: ServerRow[] }>("/api/notifications");
        const rows = response?.items ?? [];
        if (!alive || !Array.isArray(rows)) return;

        const items: NotificationItem[] = rows.map((row) => ({
          id: String(row.id),
          type: mapType(String(row.type ?? "")),
          title: "",
          message: row.body ?? "",
          createdAt: parseCreatedAt(row.created_at),
          read: !!row.is_read,
          url: row.context_url ?? undefined,
          source: "server"
        }));
        mergeServer(items);
      } catch {
        /* offline / unauthenticated — leave existing notifications in place */
      }
    };

    void load();
    const timer = window.setInterval(() => void load(), pollMs);

    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [mergeServer, pollMs]);
}
