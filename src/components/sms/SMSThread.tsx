import type { SmsMessage } from "@/api/communications";

interface SMSThreadProps {
  messages: SmsMessage[];
}

const SMSThread = ({ messages }: SMSThreadProps) => (
  <div className="sms-thread" data-testid="sms-thread">
    {messages.map((message) => (
      <div key={message.id} className="sms-thread__message">
        <div className="text-sm text-gray-600">{message.direction}</div>
        <div>{message.message}</div>
      </div>
    ))}
  </div>
);

export default SMSThread;
