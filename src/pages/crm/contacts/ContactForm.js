import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
const ContactForm = ({ onSave }) => {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const handleSubmit = (event) => {
        event.preventDefault();
        onSave({ name, email, phone });
        setName("");
        setEmail("");
        setPhone("");
    };
    return (_jsxs("form", { onSubmit: handleSubmit, className: "flex flex-col gap-2", "data-testid": "contact-form", children: [_jsx(Input, { placeholder: "Name", value: name, onChange: (e) => setName(e.target.value) }), _jsx(Input, { placeholder: "Email", value: email, onChange: (e) => setEmail(e.target.value) }), _jsx(Input, { placeholder: "Phone", value: phone, onChange: (e) => setPhone(e.target.value) }), _jsx(Button, { type: "submit", children: "Save Contact" })] }));
};
export default ContactForm;
