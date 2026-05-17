export type MessageSource = "client" | "staff" | "ai_escalation" | "system" | string;

// BF_PORTAL_BLOCK_45_v1 -- cta_label + cta_action shown in client
// mini-portal chat as a button under the bubble; staff sees them
// as a label-only pill so they know what the applicant is being
// prompted to do.
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
