import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import type { EmailMessage } from "@/api/email";
import { fetchEmailMessage, fetchEmailMessages } from "@/api/email";
import EmailMessageItem from "./EmailMessageItem";

interface EmailViewerProps {
  visible: boolean;
  contactId: string;
  onClose: () => void;
}

const EmailViewer = ({ visible, contactId, onClose }: EmailViewerProps) => {
  const [folder, setFolder] = useState<"inbox" | "sent" | "archived" | "">("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<EmailMessage | null>(null);

  const { data: messages = [] } = useQuery({
    queryKey: ["email", contactId, folder, search],
    queryFn: () => fetchEmailMessages(contactId, folder || undefined, search),
    enabled: visible
  });

  useEffect(() => {
    setSelected(messages[0] ?? null);
  }, [messages]);

  if (!visible) return null;

  const handleSelect = async (messageId: string) => {
    const message = await fetchEmailMessage(messageId);
    if (message) setSelected(message);
  };

  return (
    <div className="email-viewer" data-testid="email-viewer">
      <Card
        title="Email Viewer"
        actions={
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        }
      >
        <div className="flex gap-2 mb-2 items-center">
          <Button variant={folder === "inbox" ? "primary" : "secondary"} onClick={() => setFolder("inbox")}>Inbox</Button>
          <Button variant={folder === "sent" ? "primary" : "secondary"} onClick={() => setFolder("sent")}>Sent</Button>
          <Button variant={folder === "archived" ? "primary" : "secondary"} onClick={() => setFolder("archived")}>Archived</Button>
          <Input placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            {messages.map((message) => (
              <EmailMessageItem key={message.id} message={message} onSelect={handleSelect} />
            ))}
          </div>
          <div data-testid="email-body">
            {selected ? (
              <div>
                <div className="font-semibold">{selected.subject}</div>
                <div className="text-sm">From: {selected.from}</div>
                <div className="text-sm">To: {selected.to}</div>
                <div dangerouslySetInnerHTML={{ __html: selected.body }} />
                {selected.attachments.length > 0 && (
                  <ul>
                    {selected.attachments.map((file) => (
                      <li key={file}>{file}</li>
                    ))}
                  </ul>
                )}
                <Button className="mt-2">Log Email to CRM Timeline</Button>
              </div>
            ) : (
              <p>No message selected</p>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default EmailViewer;
