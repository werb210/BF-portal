import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import RequiredDocsEditor from "./RequiredDocsEditor";
const defaultProduct = {
    productName: "",
    category: "",
    description: "",
    commissionPercent: 0,
    minAmount: 0,
    maxAmount: 0,
    interestRate: 0,
    termLength: "",
    additionalRequirements: "",
    active: true,
    requiredDocuments: []
};
const ProductEditorDrawer = ({ product, categories, onSubmit, onUploadForm, onClose }) => {
    const [values, setValues] = useState(product ?? defaultProduct);
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [customDocs, setCustomDocs] = useState([]);
    const [saving, setSaving] = useState(false);
    useEffect(() => {
        const initial = product ?? defaultProduct;
        setValues(initial);
        const custom = (initial.requiredDocuments ?? []).filter((doc) => !categories.includes(doc));
        const fromCategories = (initial.requiredDocuments ?? []).filter((doc) => categories.includes(doc));
        setCustomDocs(custom);
        setSelectedCategories(fromCategories);
    }, [product, categories]);
    const toggleCategory = (category) => {
        setSelectedCategories((prev) => (prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]));
    };
    const addCustomDoc = () => setCustomDocs((prev) => [...prev, ""]);
    const updateCustomDoc = (index, value) => {
        setCustomDocs((prev) => prev.map((doc, i) => (i === index ? value : doc)));
    };
    const removeCustomDoc = (index) => {
        setCustomDocs((prev) => prev.filter((_, i) => i !== index));
    };
    const isValid = useMemo(() => Boolean(values.productName && values.category), [values]);
    const handleFile = async (event) => {
        const file = event.target.files?.[0];
        if (!file || !onUploadForm)
            return;
        const url = await onUploadForm(file);
        setValues((prev) => ({ ...prev, applicationFormUrl: url }));
    };
    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!isValid)
            return;
        setSaving(true);
        await onSubmit({ ...values, requiredDocuments: [...selectedCategories, ...customDocs.filter(Boolean)] }, { categories: selectedCategories, custom: customDocs.filter(Boolean) });
        setSaving(false);
        onClose();
    };
    return (_jsxs("div", { className: "lender-drawer", role: "dialog", "aria-label": "Product editor", children: [_jsxs("form", { className: "lender-form-grid", onSubmit: handleSubmit, children: [_jsx(Input, { label: "Product name", required: true, value: values.productName, onChange: (e) => setValues({ ...values, productName: e.target.value }) }), _jsx(Input, { label: "Category", required: true, value: values.category ?? "", onChange: (e) => setValues({ ...values, category: e.target.value }) }), _jsx(Input, { label: "Description", value: values.description ?? "", onChange: (e) => setValues({ ...values, description: e.target.value }) }), _jsx(Input, { label: "Commission %", type: "number", value: values.commissionPercent ?? 0, onChange: (e) => setValues({ ...values, commissionPercent: Number(e.target.value) }) }), _jsx(Input, { label: "Minimum amount", type: "number", value: values.minAmount ?? 0, onChange: (e) => setValues({ ...values, minAmount: Number(e.target.value) }) }), _jsx(Input, { label: "Maximum amount", type: "number", value: values.maxAmount ?? 0, onChange: (e) => setValues({ ...values, maxAmount: Number(e.target.value) }) }), _jsx(Input, { label: "Interest rate", type: "number", value: values.interestRate ?? 0, onChange: (e) => setValues({ ...values, interestRate: Number(e.target.value) }) }), _jsx(Input, { label: "Term length", value: values.termLength ?? "", onChange: (e) => setValues({ ...values, termLength: e.target.value }) }), _jsx(Input, { label: "Additional requirements", value: values.additionalRequirements ?? "", onChange: (e) => setValues({ ...values, additionalRequirements: e.target.value }) }), _jsxs("label", { className: "ui-field", children: [_jsx("span", { className: "ui-field__label", children: "Application form (PDF)" }), _jsx("input", { type: "file", accept: "application/pdf", onChange: handleFile }), values.applicationFormUrl && _jsx("span", { className: "lender-pill lender-pill--muted", children: "Form uploaded" })] }), _jsxs("label", { className: "ui-field", children: [_jsx("span", { className: "ui-field__label", children: "Status" }), _jsxs("select", { className: "ui-select", value: values.active ? "active" : "inactive", onChange: (e) => setValues({ ...values, active: e.target.value === "active" }), children: [_jsx("option", { value: "active", children: "Active" }), _jsx("option", { value: "inactive", children: "Inactive" })] })] })] }), _jsx(RequiredDocsEditor, { categories: categories, selectedCategories: selectedCategories, customDocs: customDocs, onToggleCategory: toggleCategory, onAddCustom: addCustomDoc, onUpdateCustom: updateCustomDoc, onRemoveCustom: removeCustomDoc }), _jsxs("div", { className: "lender-actions", children: [_jsx(Button, { type: "button", className: "ui-button--ghost", onClick: onClose, children: "Cancel" }), _jsx(Button, { type: "submit", disabled: !isValid || saving, onClick: handleSubmit, children: saving ? "Saving..." : "Save product" })] })] }));
};
export default ProductEditorDrawer;
