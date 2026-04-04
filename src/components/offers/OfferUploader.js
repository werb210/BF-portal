import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { api } from "@/api";
const OfferUploader = ({ applicationId }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const onSubmit = async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const formData = new FormData(form);
        setIsSubmitting(true);
        try {
            await api.post("/api/offers", formData);
            form.reset();
        }
        finally {
            setIsSubmitting(false);
        }
    };
    return (_jsxs("form", { className: "grid gap-2", onSubmit: onSubmit, children: [_jsx("input", { name: "applicationId", defaultValue: applicationId, hidden: true, readOnly: true }), _jsx("input", { name: "lender", placeholder: "Lender", required: true }), _jsx("input", { name: "amount", type: "number", placeholder: "Amount", required: true }), _jsx("input", { name: "rateFactor", placeholder: "Rate/Factor", required: true }), _jsx("input", { name: "term", placeholder: "Term", required: true }), _jsx("input", { name: "paymentFrequency", placeholder: "Payment Frequency", required: true }), _jsx("input", { name: "expiry", type: "date" }), _jsx("input", { name: "file", type: "file", accept: "application/pdf" }), _jsx("button", { type: "submit", disabled: isSubmitting, children: isSubmitting ? "Uploading..." : "Upload Offer" })] }));
};
export default OfferUploader;
