import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { fetchCompanyContacts, fetchTimeline } from "@/api/crm";
import TimelineFeed from "@/pages/crm/timeline/TimelineFeed";
const CompanyDetailsDrawer = ({ company, onClose }) => {
    const [contacts, setContacts] = useState([]);
    const [timeline, setTimeline] = useState([]);
    useEffect(() => {
        if (!company)
            return;
        let isActive = true;
        fetchCompanyContacts(company).then((result) => {
            if (isActive)
                setContacts(result);
        });
        fetchTimeline("company", company.id).then((result) => {
            if (isActive)
                setTimeline(result);
        });
        return () => {
            isActive = false;
        };
    }, [company]);
    if (!company)
        return null;
    return (_jsxs("aside", { className: "drawer", "data-testid": "company-drawer", children: [_jsxs("div", { className: "drawer__header", children: [_jsx("h3", { children: company.name }), _jsx(Button, { variant: "secondary", onClick: onClose, children: "Close" })] }), _jsxs("div", { className: "drawer__content", children: [_jsxs(Card, { title: "Basic Info", children: [_jsxs("p", { children: ["Industry: ", company.industry] }), company.website ? _jsxs("p", { children: ["Website: ", company.website] }) : null, _jsxs("p", { children: ["Silo: ", company.silo] }), _jsxs("p", { children: ["Owner: ", company.owner] }), _jsxs("p", { children: ["Tags: ", company.tags.join(", ")] }), company.referrerName ? _jsxs("p", { children: ["Referred by: ", company.referrerName] }) : null] }), _jsx(Card, { title: "Contacts", children: contacts.map((contact) => (_jsx("div", { children: contact.name }, contact.id))) }), _jsx(Card, { title: "CRM Timeline", children: _jsx(TimelineFeed, { entityId: company.id, entityType: "company", initialEvents: timeline }) })] })] }));
};
export default CompanyDetailsDrawer;
