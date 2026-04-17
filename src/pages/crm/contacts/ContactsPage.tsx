import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Card from "@/components/ui/Card";
import Table from "@/components/ui/Table";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import ContactRow from "./ContactRow";
import ContactDetailsDrawer from "./ContactDetailsDrawer";
import ContactForm from "./ContactForm";
import { fetchContacts } from "@/api/crm";
import type { Contact } from "@/api/crm";
import { useCrmStore } from "@/state/crm.store";
import { useSilo } from "@/hooks/useSilo";
import { getErrorMessage } from "@/utils/errors";
import { getRequestId } from "@/utils/requestId";
import { emitUiTelemetry } from "@/utils/uiTelemetry";
import { logger } from "@/utils/logger";

const owners = ["Alex", "Taylor"];

const ContactsPage = () => {
  const { silo, setSilo, filters, setFilters, resetFilters } = useCrmStore();
  const { silo: globalSilo } = useSilo();

  useEffect(() => {
    setSilo(globalSilo as "BF" | "BI" | "SLF");
  }, [globalSilo, setSilo]);

  const [selected, setSelected] = useState<Contact | null>(null);
  const [showForm, setShowForm] = useState(false);
  const {
    data: contacts = [],
    isLoading,
    error
  } = useQuery<Contact[], Error>({
    queryKey: ["contacts", silo, filters],
    queryFn: fetchContacts
  });

  useEffect(() => {
    if (error) {
      logger.error("Failed to load contacts", { requestId: getRequestId(), error });
    }
  }, [error]);

  useEffect(() => {
    if (!isLoading && !error) {
      emitUiTelemetry("data_loaded", { view: "crm_contacts", count: contacts.length });
    }
  }, [contacts.length, error, isLoading]);

  const filtered = useMemo(() => contacts, [contacts]);

  const dedupeCount = useMemo(() => {
    const seen = new Set<string>();
    let duplicates = 0;
    contacts.forEach((contact) => {
      const key = `${contact.email.toLowerCase()}::${contact.phone}`;
      if (seen.has(key)) {
        duplicates += 1;
      } else {
        seen.add(key);
      }
    });
    return duplicates;
  }, [contacts]);

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ search: event.target.value });
  };

  return (
    <div className="page" data-testid="contacts-page">
      <Card title="Contacts" actions={<Button onClick={() => setShowForm(true)}>Add Contact</Button>}>
        <div className="crm-filters-row">
          <Input placeholder="Search contacts" value={filters.search} onChange={handleSearch} />
          <Select
            value={filters.owner ?? ""}
            onChange={(e) => setFilters({ owner: e.target.value || null })}
            data-testid="owner-filter"
          >
            <option value="">All owners</option>
            {owners.map((owner) => (
              <option key={owner} value={owner}>
                {owner}
              </option>
            ))}
          </Select>
          <label className="crm-filters-row__checkbox">
            <input
              type="checkbox"
              checked={filters.hasActiveApplication}
              onChange={(e) => setFilters({ hasActiveApplication: e.target.checked })}
            />
            Has active applications
          </label>
          <Button variant="secondary" onClick={resetFilters}>
            Reset
          </Button>
        </div>
        {error && <p className="text-red-700">{getErrorMessage(error, "Unable to load contacts.")}</p>}
        {!error && dedupeCount > 0 ? (
          <p className="mb-2 text-amber-700" data-testid="dedupe-indicator">Potential duplicates detected: {dedupeCount}</p>
        ) : null}
        {!error && (
          <div className="crm-table-wrap">
            <Table headers={["Name", "Email", "Phone", "Silo", "Owner", "Active", "Actions"]}>
              {isLoading && (
                <tr>
                  <td colSpan={7}>Loading contacts…</td>
                </tr>
              )}
              {!isLoading &&
                filtered.map((contact) => (
                  <ContactRow
                    key={contact.id}
                    contact={contact}
                    onSelect={setSelected}
                    onCall={() => setSelected(contact)}
                  />
                ))}
            </Table>

            {!isLoading && filtered.length === 0 && (
              <div className="ui-empty-state">
                <div className="ui-empty-state__icon" aria-hidden="true">👤</div>
                <h3>No contacts yet</h3>
                <p>Start building your CRM by adding your first contact.</p>
                <button type="button" className="ui-button" onClick={() => setShowForm(true)}>
                  Add First Contact
                </button>
              </div>
            )}
          </div>
        )}
      </Card>
      {showForm && (
        <Card title="New Contact" actions={<Button onClick={() => setShowForm(false)}>Close</Button>}>
          <ContactForm onSave={() => setShowForm(false)} />
        </Card>
      )}
      <ContactDetailsDrawer contact={selected} onClose={() => setSelected(null)} />
    </div>
  );
};

export default ContactsPage;
