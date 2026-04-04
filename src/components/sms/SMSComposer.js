import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { fetchSmsThread, sendSms } from "@/api/communications";
import SMSThread from "./SMSThread";
import { useCrmStore } from "@/state/crm.store";
const siloNumbers = {
    BF: "+1-800-BF",
    SLF: "+1-800-SLF",
    BI: "+1-800-BI"
};
const SMSComposer = ({ visible, contact, onClose }) => {
    const queryClient = useQueryClient();
    const { silo } = useCrmStore();
    const [body, setBody] = useState("");
    const { data: messages = [] } = useQuery({
        queryKey: ["sms", contact.id],
        queryFn: () => fetchSmsThread(contact.id),
        enabled: visible
    });
    useEffect(() => {
        if (!visible)
            setBody("");
    }, [visible]);
    if (!visible)
        return null;
    const handleSend = async () => {
        if (!body)
            return;
        const phone = siloNumbers[silo];
        if (!phone)
            return;
        await sendSms(contact, body, phone);
        setBody("");
        queryClient.invalidateQueries({ queryKey: ["sms", contact.id] });
    };
    return (_jsx("div", { className: "sms-composer", "data-testid": "sms-composer", children: _jsxs(Card, { title: `SMS — ${contact.name}`, actions: _jsx(Button, { variant: "secondary", onClick: onClose, children: "Close" }), children: [_jsxs("p", { children: ["Messages sent from ", siloNumbers[silo] ?? "Unknown number"] }), _jsx(SMSThread, { messages: messages }), _jsxs("div", { className: "flex gap-2 items-center mt-2", children: [_jsxs(Select, { value: silo, onChange: () => undefined, children: [_jsx("option", { value: "BF", children: "BF" }), _jsx("option", { value: "BI", children: "BI" }), _jsx("option", { value: "SLF", children: "SLF" })] }), _jsx(Input, { placeholder: "Type message", value: body, onChange: (e) => setBody(e.target.value) }), _jsx(Button, { onClick: handleSend, children: "Submit" })] })] }) }));
};
export default SMSComposer;
