import { useEffect, useState } from "react";
import { withApiBase } from "@/lib/apiBase";

type ContactSubmission = {
  id: string;
  company: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

type ContactSubmissionsProps = {
  isAdmin: boolean;
};

type LeadFilter = "all" | "startup_interest";

export function ContactSubmissions({ isAdmin }: ContactSubmissionsProps) {
  const [contacts, setContacts] = useState<ContactSubmission[]>([]);
  const [leadFilter, setLeadFilter] = useState<LeadFilter>("all");

  async function load() {
    const query = leadFilter === "startup_interest" ? "?tag=startup_interest" : "";
    const res = await fetch(withApiBase(`/api/support/contact${query}`));
    const data = (await res.json()) as ContactSubmission[];
    setContacts(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    if (!isAdmin) return;
    void load();
  }, [isAdmin, leadFilter]);

  if (!isAdmin) return null;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Website Contact Leads</h2>
        <select
          value={leadFilter}
          onChange={(event) => setLeadFilter(event.target.value as LeadFilter)}
          className="rounded border border-slate-300 px-2 py-1 text-sm"
        >
          <option value="all">All Leads</option>
          <option value="startup_interest">Startup Interest</option>
        </select>
      </div>
      <div className="space-y-3">
        {contacts.map((contact) => (
          <div key={contact.id} className="rounded border border-slate-200 p-3">
            <strong>{contact.company}</strong>
            <p>
              {contact.firstName} {contact.lastName}
            </p>
            <p>{contact.email}</p>
            <p>{contact.phone}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
