import Button from "@/components/ui/Button";
import type { Contact } from "@/api/crm";

interface ContactRowProps {
  contact: Contact;
  onSelect: (contact: Contact) => void;
  onCall: (contact: Contact) => void;
}

const ContactRow = ({ contact, onSelect, onCall }: ContactRowProps) => (
  <tr data-testid={`contact-row-${contact.id}`}>
    <td>
      <div className="crm-name">
        <span>{contact.name}</span>
        {contact.referrerName ? (
          <span className="referrer-badge">Referred by {contact.referrerName}</span>
        ) : null}
      </div>
    </td>
    <td>{contact.email}</td>
    <td>{contact.phone}</td>
    <td>{contact.silo}</td>
    <td>{contact.owner}</td>
    <td>{contact.hasActiveApplication ? "Yes" : "No"}</td>
    <td>
      <div className="flex gap-2">
        <Button onClick={() => onSelect(contact)}>Details</Button>
        <Button variant="secondary" onClick={() => onCall(contact)}>
          Call
        </Button>
      </div>
    </td>
  </tr>
);

export default ContactRow;
