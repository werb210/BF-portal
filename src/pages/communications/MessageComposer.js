import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import Button from "@/components/ui/Button";
import ChannelSelector from "./ChannelSelector";
const MessageComposer = ({ conversation, onSend }) => {
    const [body, setBody] = useState("");
    const defaultChannel = conversation?.type === "sms" ? "sms" : "chat";
    const [channel, setChannel] = useState(defaultChannel);
    const handleSend = () => {
        if (!body.trim() || !conversation)
            return;
        void onSend(body, channel);
        setBody("");
    };
    return (_jsxs("div", { className: "border-t pt-3 mt-3", "data-testid": "message-composer", children: [_jsxs("div", { className: "flex gap-2 items-center mb-2", children: [_jsx(ChannelSelector, { value: channel, onChange: setChannel, allowSms: !!conversation && conversation.type === "sms" }), _jsx("span", { className: "text-xs text-slate-500", children: "Channel auto-detected from conversation type, but you can switch when SMS is available." })] }), _jsxs("label", { className: "ui-field", children: [_jsx("span", { className: "ui-field__label", children: "Message" }), _jsx("textarea", { className: "ui-input min-h-[80px]", placeholder: "Type your reply", value: body, onChange: (e) => setBody(e.target.value), rows: 3 })] }), _jsx("div", { className: "flex justify-end mt-2", children: _jsx(Button, { onClick: handleSend, disabled: !body.trim() || !conversation, children: "Submit" }) })] }));
};
export default MessageComposer;
