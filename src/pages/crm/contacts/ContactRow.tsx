import Button from "@/components/ui/Button";
import type { CSSProperties } from "react";
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
  const leadStatus = raw.lead_status ?? "New";
  const normalizedStatus = leadStatus.toLowerCase();
  const statusStyle: CSSProperties =
    normalizedStatus === "new"
      ? { background: "rgba(47, 168, 106, 0.12)", color: "var(--ui-accent-fg)" }
      : normalizedStatus === "qualified"
        ? { background: "#dcfce7", color: "#15803d" }
        : normalizedStatus === "lost"
          ? { background: "#fee2e2", color: "#dc2626" }
          : { background: "var(--ui-surface-muted)", color: "var(--ui-text-muted)" };

  return (
    <tr data-testid={`contact-row-${contact.id}`} onClick={() => onSelect(contact)} style={{ cursor: "pointer" }}>
      <td>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 999, background: "rgba(47, 168, 106, 0.12)", color: "var(--ui-accent-fg)", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700 }}>
            {contact.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
          </div>
          {/* BF_PORTAL_BLOCK_v_CRM_DEAD_LINKS_v1 — row already navigates via onSelect. */}
          <span style={{ color: "var(--ui-accent-fg)", fontWeight: 600 }}>{contact.name}</span>
        </div>
      </td>
      <td>{raw.company_name ?? "—"}</td>
      <td><span className="status-pill" style={statusStyle}>{leadStatus}</span></td>
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
