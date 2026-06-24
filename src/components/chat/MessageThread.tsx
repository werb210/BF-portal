import type { MessageRecord } from "@/types/messages.types";

const resolveSenderLabel = (message: MessageRecord) => {
  if (message.senderName) return message.senderName;
  if (message.senderType) return message.senderType;
  return "Unidentified sender";
};

const resolveStatusLabel = (message: MessageRecord) => {
  if (message.status) return message.status;
  if (message.readAt) return "read";
  return "unread";
};

const MessageThread = ({ messages }: { messages: MessageRecord[] }) => (
  <div className="messages-thread">
    {messages.length ? (
      messages.map((message) => (
        <div key={message.id} className="note-message">
          <div className="note-message__avatar">{resolveSenderLabel(message).slice(0, 2).toUpperCase()}</div>
          <div className="note-message__body">
            <div className="note-message__author">{resolveSenderLabel(message)}</div>
            <div className="note-message__text">{message.body}</div>
            {/* BF_PORTAL_BLOCK_45_v1 -- read-only CTA pill */}
            {message.ctaLabel ? (
              <div
                style={{
                  display: "inline-block",
                  marginTop: 6,
                  padding: "4px 10px",
                  fontSize: 11,
                  fontWeight: 600,
                  background: "rgba(47, 168, 106, 0.12)",
                  color: "var(--ui-accent-fg)",
                  borderRadius: 12,
                }}
              >
                🔘 {message.ctaLabel}
              </div>
            ) : null}
            <div className="note-message__timestamp">
              {message.createdAt}
              {message.source ? ` · ${message.source}` : ""}
              {message.status || message.readAt ? ` · ${resolveStatusLabel(message)}` : ""}
            </div>
          </div>
        </div>
      ))
    ) : (
      <div className="drawer-placeholder">No messages yet.</div>
    )}
  </div>
);

export default MessageThread;
