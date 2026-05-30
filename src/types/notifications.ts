export type NotificationType =
  | "auth_alert"
  | "document_requested"
  | "lender_status"
  | "system_alert"
  | "new_message";

export type NotificationSource = "push" | "in_app";

export type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: number;
  read: boolean;
  url?: string;
  source: NotificationSource;
};

export type PushNotificationPayload = {
  title?: string;
  body?: string;
  url?: string;
  type?: NotificationType;
  createdAt?: number;
};
