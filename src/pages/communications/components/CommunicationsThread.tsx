import { useMemo } from "react";
import MessageThread, { type ThreadMessage } from "@/components/messaging/MessageThread";
import { useAuth } from "@/hooks/useAuth";

export type CommRow = {
  id: string;
  body?: string | null;
  text?: string | null;
  message?: string | null;
  content?: string | null;
  direction?: "inbound" | "outbound" | "in" | "out" | null;
  author?: string | null;
  authorRole?: "staff" | "client" | "self" | "other" | null;
  authorName?: string | null;
  fromUserId?: string | null;
  from_user_id?: string | null;
  createdAt?: string | null;
  created_at?: string | null;
  sentAt?: string | null;
  sent_at?: string | null;
};

type Props = {
  messages: CommRow[];
  emptyText?: string;
  onHashtagClick?: (tag: string, label: string) => void;
};

function pickBody(r: CommRow): string {
  return String(r.body ?? r.text ?? r.message ?? r.content ?? "");
}

function pickCreatedAt(r: CommRow): string {
  return String(r.createdAt ?? r.created_at ?? r.sentAt ?? r.sent_at ?? new Date().toISOString());
}

function deriveRole(r: CommRow, currentUserId: string | null): "self" | "other" {
  if (r.authorRole === "self" || r.authorRole === "staff") return "self";
  if (r.authorRole === "other" || r.authorRole === "client") return "other";
  if (r.direction === "outbound" || r.direction === "out") return "self";
  if (r.direction === "inbound" || r.direction === "in") return "other";
  const fromId = r.fromUserId ?? r.from_user_id ?? null;
  if (fromId && currentUserId && fromId === currentUserId) return "self";
  return "other";
}

export default function CommunicationsThread({ messages, emptyText, onHashtagClick }: Props) {
  const { user } = useAuth();
  const currentUserId = (user as { id?: string | null } | null)?.id ?? null;

  const items: ThreadMessage[] = useMemo(
    () =>
      messages.map((r) => ({
        id: r.id,
        authorRole: deriveRole(r, currentUserId),
        authorName: r.authorName ?? r.author ?? undefined,
        body: pickBody(r),
        createdAt: pickCreatedAt(r),
      })),
    [messages, currentUserId]
  );

  return <MessageThread messages={items} emptyText={emptyText} onHashtagClick={onHashtagClick} />;
}
