import { useState } from "react";
import Button from "@/components/ui/Button";
import type { CommunicationConversation, CommunicationType } from "@/api/communications";
import ChannelSelector from "./ChannelSelector";

interface MessageComposerProps {
  conversation?: CommunicationConversation;
  onSend: (body: string, channel: CommunicationType) => Promise<void> | void;
}

const MessageComposer = ({ conversation, onSend }: MessageComposerProps) => {
  const [body, setBody] = useState("");
  const defaultChannel: CommunicationType = conversation?.type === "sms" ? "sms" : "chat";
  const [channel, setChannel] = useState<CommunicationType>(defaultChannel);

  const handleSend = () => {
    if (!body.trim() || !conversation) return;
    void onSend(body, channel);
    setBody("");
  };

  return (
    <div className="border-t pt-3 mt-3" data-testid="message-composer">
      <div className="flex gap-2 items-center mb-2">
        <ChannelSelector value={channel} onChange={setChannel} allowSms={!!conversation && conversation.type === "sms"} />
        <span className="text-xs text-slate-500">
          Channel auto-detected from conversation type, but you can switch when SMS is available.
        </span>
      </div>
      <label className="ui-field">
        <span className="ui-field__label">Message</span>
        <textarea
          className="ui-input min-h-[80px]"
          placeholder="Type your reply"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
        />
      </label>
      <div className="flex justify-end mt-2">
        <Button onClick={handleSend} disabled={!body.trim() || !conversation}>
          Submit
        </Button>
      </div>
    </div>
  );
};

export default MessageComposer;
