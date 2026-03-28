import type { EmailMessage } from "@/api/email";

interface EmailMessageItemProps {
  message: EmailMessage;
  onSelect: (messageId: string) => void;
}

const EmailMessageItem = ({ message, onSelect }: EmailMessageItemProps) => (
  <div
    className="email-message-item cursor-pointer"
    onClick={() => onSelect(message.id)}
    data-testid={`email-item-${message.id}`}
  >
    <div className="font-semibold">{message.subject}</div>
    <div className="text-sm text-gray-600">From: {message.from}</div>
    <div className="text-sm text-gray-600">To: {message.to}</div>
  </div>
);

export default EmailMessageItem;
