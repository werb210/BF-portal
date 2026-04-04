import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
const CompanyForm = ({ onSave }) => {
    const [name, setName] = useState("");
    const [industry, setIndustry] = useState("");
    const handleSubmit = (event) => {
        event.preventDefault();
        onSave({ name, industry });
        setName("");
        setIndustry("");
    };
    return (_jsxs("form", { onSubmit: handleSubmit, className: "flex flex-col gap-2", "data-testid": "company-form", children: [_jsx(Input, { placeholder: "Name", value: name, onChange: (e) => setName(e.target.value) }), _jsx(Input, { placeholder: "Industry", value: industry, onChange: (e) => setIndustry(e.target.value) }), _jsx(Button, { type: "submit", children: "Save Company" })] }));
};
export default CompanyForm;
