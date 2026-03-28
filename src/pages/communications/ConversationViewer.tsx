import { useEffect, useMemo, useRef } from "react";
import Button from "@/components/ui/Button";
import type { CommunicationConversation, CommunicationMessage } from "@/api/communications";
import MessageBubble from "./MessageBubble";
import MessageComposer from "./MessageComposer";

interface ConversationViewerProps {
  conversation?: CommunicationConversation;
  onSend: (body: string, channel: CommunicationMessage["type"]) => Promise<void>;
  onAcknowledgeIssue?: (conversationId: string) => void;
}

const ConversationViewer = ({ conversation, onSend, onAcknowledgeIssue }: ConversationViewerProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation?.messages.length]);

  const metadata = useMemo(() => {
    if (!conversation) return null;
    return [
      conversation.contactName || "Unnamed contact",
      conversation.applicationName || conversation.applicationId,
      `Channel: ${conversation.type}`,
      conversation.assignedTo ? `Assigned: ${conversation.assignedTo}` : "Unassigned"
    ].filter(Boolean);
  }, [conversation]);

  if (!conversation) {
    return <div className="text-sm text-slate-500">Select a conversation to get started.</div>;
  }

  const issueScreenshot = typeof conversation?.metadata?.screenshot === "string" ? conversation.metadata.screenshot : undefined;

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-3">
        <div>
          <div className="text-lg font-semibold">{conversation.contactName || conversation.applicationName}</div>
          <div className="text-sm text-slate-500 space-x-2">
            {metadata?.map((item) => (
              <span key={item} className="inline-block">
                {item}
              </span>
            ))}
          </div>
          <div className="text-xs text-indigo-700 mt-1 space-x-3">
            {conversation.contactId && <span>View in CRM Timeline</span>}
            {conversation.applicationId && <span>View in Application Card</span>}
          </div>
        </div>
        {conversation.type === "issue" && !conversation.acknowledged && (
          <Button onClick={() => onAcknowledgeIssue?.(conversation.id)} variant="secondary">
            Acknowledge Issue
          </Button>
        )}
      </div>
      <div className="bg-white border rounded p-3 overflow-y-auto flex-1" data-testid="conversation-viewer" ref={scrollRef}>
      {conversation.type === "issue" && issueScreenshot && (
        <img
          src={issueScreenshot}
          alt="Issue screenshot thumbnail"
          className="mb-3 max-h-44 rounded border"
        />
      )}
        {conversation.messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {!conversation.messages.length && (
          <div className="text-sm text-slate-500">No messages yet. Start the conversation below.</div>
        )}
      </div>
      <MessageComposer conversation={conversation} onSend={(body, channel) => onSend(body, channel)} />
    </div>
  );
};

export default ConversationViewer;
