import type { CommunicationConversation } from "@/api/communications";

const channelIcons: Record<string, string> = {
  chat: "💬",
  sms: "📱",
  human: "🧑‍💼",
  issue: "⚠️",
  system: "🔔",
  credit_readiness: "📄",
  contact_form: "📝"
};

interface ConversationItemProps {
  conversation: CommunicationConversation;
  selected?: boolean;
  onSelect: (id: string) => void;
}

const badgeColor = (type: CommunicationConversation["type"]) => {
  if (type === "human") return "bg-orange-100 text-orange-800";
  if (type === "issue") return "bg-red-100 text-red-800";
  return "bg-slate-100 text-slate-800";
};

const ConversationItem = ({ conversation, selected, onSelect }: ConversationItemProps) => {
  const lastMessage = conversation.messages[conversation.messages.length - 1];
  const preview = lastMessage?.message ?? conversation.message;
  const unread = conversation.unread ?? 0;
  const icon = channelIcons[conversation.type];

  return (
    <button
      className={`w-full text-left p-3 rounded border mb-2 flex gap-3 ${
        selected ? "border-indigo-500 bg-indigo-50" : "border-slate-200"
      } ${conversation.highlighted ? "ring-2 ring-orange-300" : ""}`}
      onClick={() => onSelect(conversation.id)}
      data-testid={`conversation-${conversation.id}`}
    >
      <div className="text-xl" aria-label={`${conversation.type} icon`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center">
          <div className="font-semibold truncate">
            {conversation.contactName || conversation.applicationName || "Unassigned Contact"}
          </div>
          <div className="text-xs text-slate-500">{new Date(conversation.updatedAt).toLocaleTimeString()}</div>
        </div>
        <div className="text-sm text-slate-600 truncate">{preview}</div>
        <div className="flex gap-2 items-center mt-1">
          <span className={`text-xs px-2 py-1 rounded ${badgeColor(conversation.type)}`}>
            {conversation.type.toUpperCase()}
          </span>
          <span className="text-xs text-slate-500">Silo: {conversation.silo}</span>
          {conversation.assignedTo && <span className="text-xs text-slate-500">{conversation.assignedTo}</span>}
          {unread > 0 && (
            <span className="bg-indigo-500 text-white text-xs rounded-full px-2" aria-label="unread-count">
              {unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
};

export default ConversationItem;
