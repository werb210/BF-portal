import { useCallback, useEffect, useMemo, useState } from "react";
import api from "@/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Card from "@/components/ui/Card";
import Table from "@/components/ui/Table";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import ContactRow from "./ContactRow";
import ContactDetailsDrawer from "./ContactDetailsDrawer";
import ContactForm from "./ContactForm";
import { fetchContacts, createContact } from "@/api/crm";
import type { Contact } from "@/api/crm";
import { useCrmStore } from "@/state/crm.store";
import { useSilo } from "@/hooks/useSilo";
import { getErrorMessage } from "@/utils/errors";
import { getRequestId } from "@/utils/requestId";
import { emitUiTelemetry } from "@/utils/uiTelemetry";
import { logger } from "@/utils/logger";

type OwnerApiRecord = {
  id?: string;
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
};

type OwnerOption = {
  id: string;
  label: string;
};

const ContactsPage = () => {
  const queryClient = useQueryClient();
  const { silo, setSilo, filters, setFilters, resetFilters } = useCrmStore();
  const { silo: globalSilo } = useSilo();

  useEffect(() => {
    setSilo(globalSilo as "BF" | "BI" | "SLF");
  }, [globalSilo, setSilo]);


  const [owners, setOwners] = useState<OwnerOption[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadOwners = async () => {
      try {
        const response = await api.get<OwnerApiRecord[] | { users?: OwnerApiRecord[] }>("/api/users", {
          params: { silo }
        });
        const users = Array.isArray(response) ? response : Array.isArray(response?.users) ? response.users : [];
        const options = users
          .map((user) => {
            const id = typeof user.id === "string" ? user.id : "";
            if (!id) return null;
            const firstName = user.first_name ?? user.firstName ?? "";
            const lastName = user.last_name ?? user.lastName ?? "";
            const fullName = `${firstName} ${lastName}`.trim();
            const label = fullName || user.name?.trim() || user.email?.trim() || id;
            return { id, label };
          })
          .filter((option): option is OwnerOption => Boolean(option));

        if (isMounted) {
          setOwners(options);
          if (filters.owner && !options.some((option) => option.id === filters.owner)) {
            setFilters({ owner: null });
          }
        }
      } catch {
        if (isMounted) {
          setOwners([]);
        }
      }
    };

    void loadOwners();

    return () => {
      isMounted = false;
    };
  }, [silo, filters.owner, setFilters]);
  const [selected, setSelected] = useState<Contact | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSaveContact = useCallback(async (data: { name: string; email: string; phone: string }) => {
    setSaveError(null);
    try {
      await createContact({
        name: data.name,
        email: data.email,
        phone: data.phone,
        silo: (globalSilo as "BF" | "BI" | "SLF") ?? "BF",
        owner: "",
        tags: [],
      });
      setShowForm(false);
      void queryClient.invalidateQueries({ queryKey: ["contacts"] });
    } catch (err) {
      setSaveError("Failed to save contact. Please try again.");
      throw err;
    }
  }, [globalSilo, queryClient]);

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
      <Card
        title="Contacts"
        actions={<Button onClick={() => setShowForm(true)}>Add Contact</Button>}
      >
        <div className="flex gap-2 mb-2 items-center">
          <Input placeholder="Search name, email, phone, or company" value={filters.search} onChange={handleSearch} />
          <Select
            value={filters.owner ?? ""}
            onChange={(e) => setFilters({ owner: e.target.value || null })}
            data-testid="owner-filter"
          >
            <option value="">All owners</option>
            {owners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.label}
              </option>
            ))}
          </Select>
          <label className="flex items-center gap-2">
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
          <Table headers={["Name", "Company Name", "Lead Status", "Owner", "Created Date", "Actions"]}>
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
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={7}>No contacts match these filters.</td>
              </tr>
            )}
          </Table>
        )}
      </Card>
      {showForm && (
        <Card title="New Contact" actions={<Button onClick={() => setShowForm(false)}>Close</Button>}>
          {saveError && <p style={{ color: "#ef4444", marginBottom: 8, fontSize: 13 }}>{saveError}</p>}
          <ContactForm onSave={handleSaveContact} />
        </Card>
      )}
      <ContactDetailsDrawer contact={selected} onClose={() => setSelected(null)} />
    </div>
  );
};

export default ContactsPage;
