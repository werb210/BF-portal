import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { api } from "@/api";
export default function BICRM() {
    const [contacts, setContacts] = useState([]);
    const [referrers, setReferrers] = useState([]);
    const [lenders, setLenders] = useState([]);
    useEffect(() => {
        load();
    }, []);
    async function load() {
        setContacts(await api("/api/bi/crm/contacts"));
        setReferrers(await api("/api/bi/crm/referrers"));
        setLenders(await api("/api/bi/crm/lenders"));
    }
    return (_jsxs("div", { className: "max-w-7xl mx-auto px-6 space-y-8", children: [_jsx("h2", { className: "text-3xl font-semibold", children: "BI CRM" }), _jsxs("section", { children: [_jsx("h3", { className: "text-xl mb-3", children: "Contacts" }), _jsx("div", { className: "grid gap-3 md:grid-cols-2 lg:grid-cols-3", children: contacts.map((c) => (_jsxs("div", { className: "bg-brand-surface border border-card rounded-xl p-4", children: [_jsx("strong", { children: c.full_name }), _jsx("p", { children: c.email }), _jsx("p", { children: c.phone_e164 })] }, c.id))) })] }), _jsxs("section", { children: [_jsx("h3", { className: "text-xl mb-3", children: "Referrers" }), _jsx("div", { className: "grid gap-3 md:grid-cols-2 lg:grid-cols-3", children: referrers.map((r) => (_jsxs("div", { className: "bg-brand-surface border border-card rounded-xl p-4", children: [_jsx("strong", { children: r.full_name }), _jsx("p", { children: r.company_name }), _jsxs("p", { children: ["Status: ", r.agreement_status] })] }, r.id))) })] }), _jsxs("section", { children: [_jsx("h3", { className: "text-xl mb-3", children: "Lenders" }), _jsx("div", { className: "grid gap-3 md:grid-cols-2 lg:grid-cols-3", children: lenders.map((l) => (_jsxs("div", { className: "bg-brand-surface border border-card rounded-xl p-4", children: [_jsx("strong", { children: l.rep_full_name }), _jsx("p", { children: l.company_name })] }, l.id))) })] })] }));
}
