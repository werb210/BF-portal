export type MessageSource = "client" | "staff" | "ai_escalation" | "system" | string;

// BF_PORTAL_BLOCK_45_v1 -- ctaLabel + ctaAction shown in client
// mini-portal chat as a button; staff sees them as a read-only pill.
export type MessageRecord = {
  id: string;
  body: string;
  senderId?: string | null;
  senderName?: string | null;
  senderType?: "client" | "staff" | "system" | string | null;
  source?: MessageSource | null;
  createdAt: string;
  readAt?: string | null;
  status?: "read" | "unread" | "delivered" | "queued" | string | null;
  ctaLabel?: string | null;
  ctaAction?: string | null;
};
