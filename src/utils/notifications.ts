import type {
  NotificationItem,
  NotificationSource,
  NotificationType,
  PushNotificationPayload
} from "@/types/notifications";

const DEFAULT_TITLES: Record<NotificationType, string> = {
  auth_alert: "Login alert",
  document_requested: "Document requested",
  lender_status: "Lender status update",
  system_alert: "System alert",
  new_message: "New message",
  email_unopened: "Email not opened"
};

const DEFAULT_MESSAGES: Record<NotificationType, string> = {
  auth_alert: "We noticed a login or OTP event on your account.",
  document_requested: "A new document was requested.",
  lender_status: "A lender status changed.",
  system_alert: "Important system update available.",
  new_message: "You have a new message.",
  email_unopened: "This email has not been opened yet."
};

const ensureNotificationType = (type?: string): NotificationType => {
  if (
    type === "auth_alert" ||
    type === "document_requested" ||
    type === "lender_status" ||
    type === "system_alert" ||
    type === "new_message" ||
    type === "email_unopened"
  ) {
    return type;
  }
  return "system_alert";
};

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `notif-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const buildNotification = (
  payload: PushNotificationPayload,
  source: NotificationSource
): NotificationItem => {
  const type = ensureNotificationType(payload.type);
  const title = payload.title?.trim() || DEFAULT_TITLES[type];
  const message = payload.body?.trim() || DEFAULT_MESSAGES[type];
  return {
    id: createId(),
    type,
    title,
    message,
    createdAt: payload.createdAt ?? Date.now(),
    read: false,
    url: payload.url,
    source
  };
};

export const getNotificationLabel = (type: NotificationType) => DEFAULT_TITLES[type];
