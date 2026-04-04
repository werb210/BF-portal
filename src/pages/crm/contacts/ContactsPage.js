import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
import { useCrmStore } from "@/state/crm.store";
import { getErrorMessage } from "@/utils/errors";
import { getRequestId } from "@/utils/requestId";
import { emitUiTelemetry } from "@/utils/uiTelemetry";
import { logger } from "@/utils/logger";
const owners = ["Alex", "Taylor"];
const ContactsPage = () => {
    const { silo, setSilo, filters, setFilters, resetFilters } = useCrmStore();
    const [selected, setSelected] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const { data: contacts = [], isLoading, error } = useQuery({
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
        const seen = new Set();
        let duplicates = 0;
        contacts.forEach((contact) => {
            const key = `${contact.email.toLowerCase()}::${contact.phone}`;
            if (seen.has(key)) {
                duplicates += 1;
            }
            else {
                seen.add(key);
            }
        });
        return duplicates;
    }, [contacts]);
    const handleSearch = (event) => {
        setFilters({ search: event.target.value });
    };
    return (_jsxs("div", { className: "page", "data-testid": "contacts-page", children: [_jsxs(Card, { title: "Contacts", actions: _jsxs("div", { className: "flex gap-2", children: [_jsxs(Select, { value: silo, onChange: (e) => setSilo(e.target.value), children: [_jsx("option", { value: "BF", children: "BF" }), _jsx("option", { value: "BI", children: "BI" }), _jsx("option", { value: "SLF", children: "SLF" })] }), _jsx(Button, { onClick: () => setShowForm(true), children: "Add Contact" })] }), children: [_jsxs("div", { className: "flex gap-2 mb-2 items-center", children: [_jsx(Input, { placeholder: "Search", value: filters.search, onChange: handleSearch }), _jsxs(Select, { value: filters.owner ?? "", onChange: (e) => setFilters({ owner: e.target.value || null }), "data-testid": "owner-filter", children: [_jsx("option", { value: "", children: "All owners" }), owners.map((owner) => (_jsx("option", { value: owner, children: owner }, owner)))] }), _jsxs("label", { className: "flex items-center gap-2", children: [_jsx("input", { type: "checkbox", checked: filters.hasActiveApplication, onChange: (e) => setFilters({ hasActiveApplication: e.target.checked }) }), "Has active applications"] }), _jsx(Button, { variant: "secondary", onClick: resetFilters, children: "Reset" })] }), error && _jsx("p", { className: "text-red-700", children: getErrorMessage(error, "Unable to load contacts.") }), !error && dedupeCount > 0 ? (_jsxs("p", { className: "mb-2 text-amber-700", "data-testid": "dedupe-indicator", children: ["Potential duplicates detected: ", dedupeCount] })) : null, !error && (_jsxs(Table, { headers: ["Name", "Email", "Phone", "Silo", "Owner", "Active", "Actions"], children: [isLoading && (_jsx("tr", { children: _jsx("td", { colSpan: 7, children: "Loading contacts\u2026" }) })), !isLoading &&
                                filtered.map((contact) => (_jsx(ContactRow, { contact: contact, onSelect: setSelected, onCall: () => setSelected(contact) }, contact.id))), !isLoading && filtered.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 7, children: "No contacts match these filters." }) }))] }))] }), showForm && (_jsx(Card, { title: "New Contact", actions: _jsx(Button, { onClick: () => setShowForm(false), children: "Close" }), children: _jsx(ContactForm, { onSave: () => setShowForm(false) }) })), _jsx(ContactDetailsDrawer, { contact: selected, onClose: () => setSelected(null) })] }));
};
export default ContactsPage;
