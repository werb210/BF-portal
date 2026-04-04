import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { submitReferral } from "@/api/referrals";
import { useAuth } from "@/hooks/useAuth";
import { useSilo } from "@/hooks/useSilo";
import { getErrorMessage } from "@/utils/errors";
import { normalizeBusinessUnit } from "@/types/businessUnit";
const ReferrerPortal = () => {
    const { user } = useAuth();
    const { silo } = useSilo();
    const [businessName, setBusinessName] = useState("");
    const [contactName, setContactName] = useState("");
    const [website, setWebsite] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [status, setStatus] = useState(null);
    const [error, setError] = useState(null);
    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!user?.id || !user?.name)
            return;
        setIsSubmitting(true);
        setStatus(null);
        setError(null);
        try {
            const response = await submitReferral({
                businessName: businessName.trim(),
                contactName: contactName.trim(),
                website: website.trim() || undefined,
                email: email.trim(),
                phone: phone.trim(),
                referrerId: user.id,
                referrerName: user.name,
                silo: normalizeBusinessUnit(silo === "admin" ? "bf" : silo)
            });
            setStatus(`Referral submitted. CRM contact ${response.contact.name} created.`);
            setBusinessName("");
            setContactName("");
            setWebsite("");
            setEmail("");
            setPhone("");
        }
        catch (err) {
            setError(getErrorMessage(err, "Unable to submit referral."));
        }
        finally {
            setIsSubmitting(false);
        }
    };
    return (_jsxs("section", { className: "referrer-card", children: [_jsxs("div", { className: "referrer-card__header", children: [_jsx("h2", { children: "Submit a Referral" }), _jsx("p", { children: "Send a prospective borrower to our team. We will follow up within one business day." })] }), _jsxs("form", { className: "referrer-form", onSubmit: handleSubmit, children: [_jsx(Input, { label: "Business Name", value: businessName, onChange: (event) => setBusinessName(event.target.value), required: true }), _jsx(Input, { label: "Contact Name", value: contactName, onChange: (event) => setContactName(event.target.value), required: true }), _jsx(Input, { label: "Website", value: website, onChange: (event) => setWebsite(event.target.value) }), _jsx(Input, { label: "Email", type: "email", value: email, onChange: (event) => setEmail(event.target.value), required: true }), _jsx(Input, { label: "Phone", value: phone, onChange: (event) => setPhone(event.target.value), required: true }), _jsxs("div", { className: "referrer-form__actions", children: [_jsx(Button, { type: "submit", disabled: isSubmitting, children: isSubmitting ? "Submitting…" : "Submit referral" }), _jsx("span", { className: "referrer-form__note", children: "Tagged as prospect in CRM." })] }), status && _jsx("div", { className: "referrer-form__status referrer-form__status--success", children: status }), error && _jsx("div", { className: "referrer-form__status referrer-form__status--error", children: error })] })] }));
};
export default ReferrerPortal;
