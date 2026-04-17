import Button from "@/components/ui/Button";
import type { Contact } from "@/api/crm";

interface ContactRowProps {
  contact: Contact;
  onSelect: (contact: Contact) => void;
  onCall: (contact: Contact) => void;
}

const ContactRow = ({ contact, onSelect, onCall }: ContactRowProps) => {
  const raw = contact as Contact & {
    company_name?: string;
    amount_requested?: number | null;
    funding_type?: string | null;
    created_at?: string | null;
  };
  const createdAt = raw.created_at
    ? new Date(raw.created_at).toLocaleDateString("en-CA")
    : "—";
  const amount = raw.amount_requested
    ? `$${Number(raw.amount_requested).toLocaleString()}`
    : "—";
  return (
    <tr data-testid={`contact-row-${contact.id}`}>
      <td>
        <div className="crm-name">
          <span>{contact.name}</span>
          {contact.referrerName ? (
            <span className="referrer-badge">Referred by {contact.referrerName}</span>
          ) : null}
        </div>
      </td>
      <td>{raw.company_name ?? "—"}</td>
      <td>{amount}</td>
      <td>{raw.funding_type ?? "—"}</td>
      <td>{createdAt}</td>
      <td>
        <div className="flex gap-2">
          <Button onClick={() => onSelect(contact)}>Details</Button>
          <Button variant="secondary" onClick={() => onCall(contact)}>Call</Button>
        </div>
      </td>
    </tr>
  );
};

export default ContactRow;
