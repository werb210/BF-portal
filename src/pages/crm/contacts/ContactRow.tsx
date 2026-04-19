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
    lead_status?: string | null;
    owner_name?: string | null;
    created_at?: string | null;
  };
  const createdAt = raw.created_at ? new Date(raw.created_at).toLocaleDateString("en-CA") : "—";

  return (
    <tr data-testid={`contact-row-${contact.id}`} onClick={() => onSelect(contact)} style={{ cursor: "pointer" }}>
      <td>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 999, background: "#dbeafe", color: "#1d4ed8", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700 }}>
            {contact.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
          </div>
          <a href="#" onClick={(e) => e.preventDefault()}>{contact.name}</a>
        </div>
      </td>
      <td>{raw.company_name ?? "—"}</td>
      <td><span className="status-pill status-pill--active">{raw.lead_status ?? "New"}</span></td>
      <td>{raw.owner_name ?? contact.owner ?? "—"}</td>
      <td>{createdAt}</td>
      <td>
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <Button variant="secondary" onClick={() => onCall(contact)}>Call</Button>
          <Button variant="secondary" onClick={() => window.dispatchEvent(new CustomEvent("crm:sms", { detail: { contactId: contact.id } }))}>SMS</Button>
          <Button variant="secondary" onClick={() => window.dispatchEvent(new CustomEvent("crm:email", { detail: { contactId: contact.id } }))}>Email</Button>
        </div>
      </td>
    </tr>
  );
};

export default ContactRow;
