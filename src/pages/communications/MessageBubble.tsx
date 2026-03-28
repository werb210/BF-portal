import type { CommunicationMessage } from "@/api/communications";

interface MessageBubbleProps {
  message: CommunicationMessage;
}

const alignment = (direction: CommunicationMessage["direction"]) =>
  direction === "out" ? "items-end" : "items-start";

const bubbleColor = (direction: CommunicationMessage["direction"], type: CommunicationMessage["type"]) => {
  if (type === "human") return "bg-orange-100 text-orange-900";
  if (type === "issue") return "bg-red-100 text-red-900";
  return direction === "out" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-800";
};

const MessageBubble = ({ message }: MessageBubbleProps) => (
  <div className={`flex flex-col ${alignment(message.direction)} mb-2`}>
    <div className={`rounded px-3 py-2 max-w-xl ${bubbleColor(message.direction, message.type)}`}>
      <div className="text-sm whitespace-pre-wrap" data-testid="message-text">
        {message.message}
      </div>
      <div className="text-[10px] opacity-75 text-right mt-1">
        {new Date(message.createdAt).toLocaleString()} • {message.type.toUpperCase()}
      </div>
    </div>
  </div>
);

export default MessageBubble;
