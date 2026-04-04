import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { fetchLenderCompany, updateLenderCompany, uploadLenderLogo } from "@/api/lender/company";
const requiredFields = ["companyName", "supportEmail", "supportPhone"];
const CompanyEditor = () => {
    const queryClient = useQueryClient();
    const { data: company, isLoading } = useQuery({ queryKey: ["lender", "company"], queryFn: fetchLenderCompany });
    const [formState, setFormState] = useState(null);
    const [errors, setErrors] = useState({});
    const updateMutation = useMutation({
        mutationFn: updateLenderCompany,
        onSuccess: (next) => {
            setFormState(next);
            queryClient.setQueryData(["lender", "company"], next);
        }
    });
    useEffect(() => {
        if (company) {
            setFormState(company);
        }
    }, [company]);
    const isValid = useMemo(() => requiredFields.every((field) => formState?.[field]), [formState]);
    const handleChange = (field) => (event) => {
        if (!formState)
            return;
        const value = event.target.value;
        if (field.startsWith("address.")) {
            const addressField = field.split(".")[1];
            setFormState({ ...formState, address: { ...formState.address, [addressField]: value } });
            return;
        }
        setFormState({ ...formState, [field]: value });
    };
    const handleLogo = async (event) => {
        const file = event.target.files?.[0];
        if (!file || !formState)
            return;
        const response = await uploadLenderLogo(file);
        setFormState({ ...formState, logoUrl: response.url });
    };
    const handleSave = async () => {
        if (!formState)
            return;
        const nextErrors = {};
        requiredFields.forEach((field) => {
            if (!formState[field]) {
                nextErrors[field] = "Required";
            }
        });
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0)
            return;
        await updateMutation.mutateAsync(formState);
    };
    const handleCancel = () => {
        if (company)
            setFormState(company);
    };
    if (isLoading || !formState) {
        return (_jsx("div", { className: "lender-section", children: _jsx("div", { className: "lender-section__title", children: "Loading company profile..." }) }));
    }
    return (_jsxs("div", { className: "lender-section", children: [_jsx("div", { className: "lender-section__header", children: _jsx("div", { className: "lender-section__title", children: "Company Information" }) }), _jsxs("div", { className: "lender-form-grid", children: [_jsx(Input, { label: "Company name", required: true, value: formState.companyName, onChange: handleChange("companyName"), error: errors.companyName }), _jsx(Input, { label: "Website", value: formState.website ?? "", onChange: handleChange("website") }), _jsx(Input, { label: "Country", value: formState.country ?? "", onChange: handleChange("country") }), _jsx(Input, { label: "Support email", type: "email", required: true, value: formState.supportEmail ?? "", onChange: handleChange("supportEmail"), error: errors.supportEmail }), _jsx(Input, { label: "Support phone", required: true, value: formState.supportPhone ?? "", onChange: handleChange("supportPhone"), error: errors.supportPhone }), _jsx(Input, { label: "Description", value: formState.description ?? "", onChange: handleChange("description") }), _jsx(Input, { label: "Logo", type: "file", accept: "image/*", onChange: handleLogo }), formState.logoUrl && _jsx("span", { className: "lender-pill lender-pill--muted", children: "Logo uploaded" }), _jsx(Input, { label: "Address line 1", value: formState.address?.line1 ?? "", onChange: handleChange("address.line1") }), _jsx(Input, { label: "Address line 2", value: formState.address?.line2 ?? "", onChange: handleChange("address.line2") }), _jsx(Input, { label: "City", value: formState.address?.city ?? "", onChange: handleChange("address.city") }), _jsx(Input, { label: "State", value: formState.address?.state ?? "", onChange: handleChange("address.state") }), _jsx(Input, { label: "Postal code", value: formState.address?.postalCode ?? "", onChange: handleChange("address.postalCode") })] }), _jsxs("div", { className: "lender-actions", children: [_jsx(Button, { type: "button", className: "ui-button--ghost", onClick: handleCancel, children: "Cancel" }), _jsx(Button, { type: "button", disabled: !isValid || updateMutation.isPending, onClick: handleSave, children: updateMutation.isPending ? "Saving..." : "Save" })] })] }));
};
export default CompanyEditor;
