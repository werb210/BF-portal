import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import type { EmailMessage } from "@/api/email";
import { sanitizeHtml } from "@/lib/sanitizeHtml"; // BF_PORTAL_HTML_SANITIZE_v1
import { fetchEmailMessage, fetchEmailMessages, archiveEmailMessage } from "@/api/email";
import EmailMessageItem from "./EmailMessageItem";
import O365ComposeModal from "@/components/communications/O365ComposeModal";
import MailCategoryPicker from "@/components/o365/MailCategoryPicker"; // BF_PORTAL_O365_UI_v1

// BF_PORTAL_BLOCK_v803_EMAIL_REPLY_FORWARD — reply / reply-all / forward open the
// O365 composer pre-filled; sending goes through /api/o365/mail/send and is logged
// to this contact's timeline via logScope.
function rePrefix(subject: string): string {
  const t = (subject ?? "").trim();
  return /^re:/i.test(t) ? t : `Re: ${t}`;
}
function fwdPrefix(subject: string): string {
  const t = (subject ?? "").trim();
  return /^fwd?:/i.test(t) ? t : `Fwd: ${t}`;
}
function quotedBody(m: EmailMessage): string {
  const esc = (v: string) => (v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<br/><br/><hr/><div style="color:var(--ui-text-muted);font-size:12px">From: ${esc(m.from)}<br/>To: ${esc(m.to)}<br/>Subject: ${esc(m.subject)}</div><br/>${m.body ?? ""}`;
}
function dedupeEmails(list: string[]): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const e = raw.trim();
    if (!e) continue;
    const key = e.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key); out.push(e);
  }
  return out.join(", ");
}

interface EmailViewerProps {
  visible: boolean;
  contactId: string;
  contactEmail?: string;
  onClose: () => void;
}

const EmailViewer = ({ visible, contactId, contactEmail, onClose }: EmailViewerProps) => {
  const [folder, setFolder] = useState<"inbox" | "sent" | "archived" | "">("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<EmailMessage | null>(null);
  // BF_PORTAL_BLOCK_v803_EMAIL_REPLY_FORWARD
  const [compose, setCompose] = useState<{ to: string; subject: string; body: string } | null>(null);

  const { data: messages = [], refetch } = useQuery({
    queryKey: ["email", contactId, folder, search, contactEmail],
    queryFn: () => fetchEmailMessages(contactId, folder, search, contactEmail),
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
            {messages.length === 0 ? (
              <p>No emails with this contact.</p>
            ) : selected ? (
              <div>
                <div className="font-semibold">{selected.subject}</div>
                <MailCategoryPicker messageId={selected.id} />
                <div className="text-sm">From: {selected.from}</div>
                <div className="text-sm">To: {selected.to}</div>
                <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(selected.body) }} /> {/* BF_PORTAL_HTML_SANITIZE_v1 */}
                {selected.attachments.length > 0 && (
                  <ul>
                    {selected.attachments.map((file) => (
                      <li key={file}>{file}</li>
                    ))}
                  </ul>
                )}
                <div className="mt-2 flex gap-2 flex-wrap">
                  <Button
                    onClick={() => selected && setCompose({ to: selected.from, subject: rePrefix(selected.subject), body: quotedBody(selected) })}
                  >
                    Reply
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => selected && setCompose({ to: dedupeEmails([selected.from, ...selected.to.split(",")]), subject: rePrefix(selected.subject), body: quotedBody(selected) })}
                  >
                    Reply All
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => selected && setCompose({ to: "", subject: fwdPrefix(selected.subject), body: quotedBody(selected) })}
                  >
                    Forward
                  </Button>
                  <Button>Log Email to CRM Timeline</Button>
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      if (!selected) return;
                      await archiveEmailMessage(contactId, selected.id);
                      setSelected(null);
                      await refetch();
                    }}
                  >
                    Archive
                  </Button>
                </div>
              </div>
            ) : (
              <p>No message selected</p>
            )}
          </div>
        </div>
        <O365ComposeModal
          open={!!compose}
          initialTo={compose?.to ?? ""}
          initialSubject={compose?.subject ?? ""}
          initialBody={compose?.body ?? ""}
          onClose={() => setCompose(null)}
          onSent={() => setCompose(null)}
          logScope={{ kind: "contact", id: contactId }}
        />
      </Card>
    </div>
  );
};

export default EmailViewer;
