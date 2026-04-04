import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { createNote, fetchApplications, fetchContactCompanies, fetchTimeline } from "@/api/crm";
import IncomingCallToast from "@/components/dialer/IncomingCallToast";
import SMSComposer from "@/components/sms/SMSComposer";
import EmailViewer from "@/components/email/EmailViewer";
import TimelineFeed from "@/pages/crm/timeline/TimelineFeed";
import { useDialerStore } from "@/state/dialer.store";
import { startOutboundCall } from "@/services/voiceService";
import CreditReadinessPanel from "@/components/crm/CreditReadinessPanel";
import { VoicemailList } from "@/components/VoicemailList";
const ContactDetailsDrawer = ({ contact, onClose }) => {
    const [companies, setCompanies] = useState([]);
    const [applications, setApplications] = useState([]);
    const [note, setNote] = useState("");
    const [timeline, setTimeline] = useState([]);
    const [showSms, setShowSms] = useState(false);
    const [showEmail, setShowEmail] = useState(false);
    const [incoming, setIncoming] = useState(null);
    const [activeTab, setActiveTab] = useState("overview");
    const openDialer = useDialerStore((state) => state.openDialer);
    const latestLog = useDialerStore((state) => state.logs[0]);
    const lastLogId = useRef(null);
    useEffect(() => {
        if (!contact)
            return;
        let isActive = true;
        fetchContactCompanies(contact).then((result) => {
            if (isActive)
                setCompanies(result);
        });
        fetchApplications(contact.id).then((result) => {
            if (isActive)
                setApplications(result);
        });
        fetchTimeline("contact", contact.id).then((result) => {
            if (isActive)
                setTimeline(result);
        });
        return () => {
            isActive = false;
        };
    }, [contact]);
    useEffect(() => {
        if (!contact || !latestLog)
            return;
        if (latestLog.contactId !== contact.id)
            return;
        if (lastLogId.current === latestLog.id)
            return;
        const endedAt = latestLog.endedAt;
        const outcome = latestLog.outcome;
        if (latestLog.isPending || !outcome || !endedAt)
            return;
        lastLogId.current = latestLog.id;
        fetchTimeline("contact", contact.id).then((result) => {
            setTimeline(result);
        });
    }, [contact, latestLog]);
    if (!contact)
        return null;
    const handleAddNote = async () => {
        if (!note)
            return;
        const created = await createNote(contact.id, note);
        setTimeline((current) => [created, ...current]);
        setNote("");
    };
    return (_jsxs("aside", { className: "drawer", "data-testid": "contact-drawer", children: [_jsxs("div", { className: "drawer__header", children: [_jsx("h3", { children: contact.name }), _jsx(Button, { variant: "secondary", onClick: onClose, children: "Close" })] }), _jsxs("div", { className: "drawer__content", children: [_jsxs("div", { className: "mb-4 flex gap-2", children: [_jsx(Button, { variant: activeTab === "overview" ? "primary" : "secondary", onClick: () => setActiveTab("overview"), children: "Overview" }), _jsx(Button, { variant: activeTab === "readiness" ? "primary" : "secondary", onClick: () => setActiveTab("readiness"), children: "Credit Readiness" })] }), activeTab === "readiness" ? _jsx(CreditReadinessPanel, { contactId: contact.id }) : null, activeTab === "overview" ? (_jsxs(_Fragment, { children: [_jsxs(Card, { title: "Basic Info", children: [_jsxs("div", { className: "mb-2 flex items-center gap-2", children: [contact.source === "ai" && (_jsx("span", { className: "rounded bg-black px-2 py-1 text-xs text-white", children: "AI Lead" })), contact.source === "credit_readiness" && (_jsx("span", { className: "rounded bg-gray-200 px-2 py-1 text-xs", children: "Credit Readiness" })), contact.tags?.includes("startup_interest") && (_jsx("span", { className: "rounded bg-yellow-100 px-2 py-1 text-xs text-yellow-700", children: "Startup Interest" }))] }), _jsxs("p", { children: ["Email: ", contact.email] }), _jsxs("p", { children: ["Phone: ", contact.phone] }), _jsxs("p", { children: ["Silo: ", contact.silo] }), _jsxs("p", { children: ["Owner: ", contact.owner] }), _jsxs("p", { children: ["Tags: ", contact.tags.join(", ")] }), contact.tags.includes("startup_interest") ? (_jsx("p", { children: "Startup Interest: Yes" })) : null, contact.referrerName ? _jsxs("p", { children: ["Referred by: ", contact.referrerName] }) : null] }), _jsx(Card, { title: "Associated Companies", children: companies.map((company) => (_jsx("div", { children: company.name }, company.id))) }), _jsx(Card, { title: "Linked Applications", children: applications.map((app) => (_jsxs("div", { children: [app.id, " \u2014 ", app.stage] }, app.id))) }), _jsxs("div", { className: "flex gap-2 my-2", children: [_jsx(Button, { onClick: () => {
                                            void startOutboundCall(contact.id);
                                            openDialer({
                                                contactId: contact.id,
                                                contactName: contact.name,
                                                applicationId: contact.applicationIds[0],
                                                phone: contact.phone,
                                                source: "crm"
                                            });
                                        }, children: "Call" }), _jsx(Button, { onClick: () => setShowSms(true), children: "SMS" }), _jsx(Button, { onClick: () => setShowEmail(true), children: "Email" }), _jsx(Button, { variant: "secondary", onClick: () => setIncoming(contact.phone), children: "Simulate Incoming" })] }), _jsxs(Card, { title: "Add Note", children: [_jsx("textarea", { value: note, onChange: (e) => setNote(e.target.value), placeholder: "Add internal note", className: "drawer-input" }), _jsx(Button, { onClick: handleAddNote, className: "mt-2", children: "Save Note" })] }), _jsx(Card, { title: "Voicemails", children: _jsx(VoicemailList, { clientId: contact.id }) }), _jsx(Card, { title: "CRM Timeline", children: _jsx(TimelineFeed, { entityId: contact.id, entityType: "contact", initialEvents: timeline }) })] })) : null] }), incoming && (_jsx(IncomingCallToast, { from: incoming, onAccept: () => {
                    setIncoming(null);
                    openDialer({
                        contactId: contact.id,
                        contactName: contact.name,
                        applicationId: contact.applicationIds[0],
                        phone: contact.phone,
                        source: "crm"
                    });
                }, onViewRecord: () => undefined, onDismiss: () => setIncoming(null) })), _jsx(SMSComposer, { visible: showSms, contact: contact, onClose: () => setShowSms(false) }), _jsx(EmailViewer, { visible: showEmail, contactId: contact.id, onClose: () => setShowEmail(false) })] }));
};
export default ContactDetailsDrawer;
