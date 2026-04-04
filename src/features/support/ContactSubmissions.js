import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { api } from "@/api";
export function ContactSubmissions({ isAdmin }) {
    const [contacts, setContacts] = useState([]);
    const [leadFilter, setLeadFilter] = useState("all");
    async function load() {
        const query = leadFilter === "startup_interest" ? "?tag=startup_interest" : "";
        const data = await api(`/support/contact${query}`);
        setContacts(Array.isArray(data) ? data : []);
    }
    useEffect(() => {
        if (!isAdmin)
            return;
        void load();
    }, [isAdmin, leadFilter]);
    if (!isAdmin)
        return null;
    return (_jsxs("div", { children: [_jsxs("div", { className: "mb-4 flex items-center justify-between gap-3", children: [_jsx("h2", { className: "text-lg font-semibold", children: "Website Contact Leads" }), _jsxs("select", { value: leadFilter, onChange: (event) => setLeadFilter(event.target.value), className: "rounded border border-slate-300 px-2 py-1 text-sm", children: [_jsx("option", { value: "all", children: "All Leads" }), _jsx("option", { value: "startup_interest", children: "Startup Interest" })] })] }), _jsx("div", { className: "space-y-3", children: contacts.map((contact) => (_jsxs("div", { className: "rounded border border-slate-200 p-3", children: [_jsx("strong", { children: contact.company }), _jsxs("p", { children: [contact.firstName, " ", contact.lastName] }), _jsx("p", { children: contact.email }), _jsx("p", { children: contact.phone })] }, contact.id))) })] }));
}
