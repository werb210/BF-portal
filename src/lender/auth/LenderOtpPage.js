import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useLenderAuth } from "./useLenderAuth";
const LenderOtpPage = () => {
    const navigate = useNavigate();
    const { pendingEmail, verifyOtp, triggerOtp } = useLenderAuth();
    const [code, setCode] = useState("");
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const handleSubmit = async (event) => {
        event.preventDefault();
        setError(null);
        setIsSubmitting(true);
        try {
            await verifyOtp({ email: pendingEmail ?? "", code });
            navigate("/lender/dashboard", { replace: true });
        }
        catch (err) {
            setError("Invalid or expired code.");
        }
        finally {
            setIsSubmitting(false);
        }
    };
    return (_jsx("div", { className: "auth-page", children: _jsx(Card, { title: "Enter verification code", children: _jsxs("form", { className: "auth-form", onSubmit: handleSubmit, children: [_jsxs("p", { className: "text-sm text-slate-600", children: ["We sent a one-time code to ", pendingEmail || "your email", "."] }), _jsx(Input, { label: "6-digit code", name: "otp", inputMode: "numeric", pattern: "[0-9]{6}", required: true, value: code, onChange: (e) => setCode(e.target.value) }), error && _jsx("div", { className: "auth-form__error", children: error }), _jsxs("div", { className: "lender-cta-row", children: [_jsx(Button, { type: "submit", disabled: isSubmitting, children: isSubmitting ? "Verifying..." : "Verify" }), _jsx(Button, { type: "button", className: "ui-button--ghost", onClick: () => triggerOtp(), children: "Resend code" })] })] }) }) }));
};
export default LenderOtpPage;
