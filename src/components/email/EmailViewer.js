import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { fetchEmailMessage, fetchEmailMessages } from "@/api/email";
import EmailMessageItem from "./EmailMessageItem";
const EmailViewer = ({ visible, contactId, onClose }) => {
    const [folder, setFolder] = useState("");
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState(null);
    const { data: messages = [] } = useQuery({
        queryKey: ["email", contactId, folder, search],
        queryFn: () => fetchEmailMessages(contactId, folder || undefined, search),
        enabled: visible
    });
    useEffect(() => {
        setSelected(messages[0] ?? null);
    }, [messages]);
    if (!visible)
        return null;
    const handleSelect = async (messageId) => {
        const message = await fetchEmailMessage(messageId);
        if (message)
            setSelected(message);
    };
    return (_jsx("div", { className: "email-viewer", "data-testid": "email-viewer", children: _jsxs(Card, { title: "Email Viewer", actions: _jsx(Button, { variant: "secondary", onClick: onClose, children: "Close" }), children: [_jsxs("div", { className: "flex gap-2 mb-2 items-center", children: [_jsx(Button, { variant: folder === "inbox" ? "primary" : "secondary", onClick: () => setFolder("inbox"), children: "Inbox" }), _jsx(Button, { variant: folder === "sent" ? "primary" : "secondary", onClick: () => setFolder("sent"), children: "Sent" }), _jsx(Button, { variant: folder === "archived" ? "primary" : "secondary", onClick: () => setFolder("archived"), children: "Archived" }), _jsx(Input, { placeholder: "Search", value: search, onChange: (e) => setSearch(e.target.value) })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsx("div", { className: "flex flex-col gap-2", children: messages.map((message) => (_jsx(EmailMessageItem, { message: message, onSelect: handleSelect }, message.id))) }), _jsx("div", { "data-testid": "email-body", children: selected ? (_jsxs("div", { children: [_jsx("div", { className: "font-semibold", children: selected.subject }), _jsxs("div", { className: "text-sm", children: ["From: ", selected.from] }), _jsxs("div", { className: "text-sm", children: ["To: ", selected.to] }), _jsx("div", { dangerouslySetInnerHTML: { __html: selected.body } }), selected.attachments.length > 0 && (_jsx("ul", { children: selected.attachments.map((file) => (_jsx("li", { children: file }, file))) })), _jsx(Button, { className: "mt-2", children: "Log Email to CRM Timeline" })] })) : (_jsx("p", { children: "No message selected" })) })] })] }) }));
};
export default EmailViewer;
