import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
const NotesComposer = ({ onSend }) => {
    const [value, setValue] = useState("");
    const [sending, setSending] = useState(false);
    const handleSend = async () => {
        if (!value.trim())
            return;
        setSending(true);
        const mentionMatches = Array.from(value.matchAll(/@\[([A-Za-z0-9_-]+)\]/g))
            .map((match) => match[1])
            .filter((mention) => Boolean(mention));
        await onSend(value, mentionMatches);
        setValue("");
        setSending(false);
    };
    return (_jsxs("div", { className: "notes-composer", children: [_jsx("textarea", { className: "notes-composer__input", value: value, onChange: (e) => setValue(e.target.value), placeholder: "Add a note" }), _jsx("button", { className: "btn btn--primary", onClick: handleSend, disabled: sending, type: "button", children: sending ? "Submitting…" : "Submit" })] }));
};
export default NotesComposer;
