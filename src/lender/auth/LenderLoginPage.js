import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useLenderAuth } from "./useLenderAuth";
const LenderLoginPage = () => {
    const navigate = useNavigate();
    const { login, triggerOtp } = useLenderAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const handleSubmit = async (event) => {
        event.preventDefault();
        setError(null);
        setIsSubmitting(true);
        try {
            await login({ email, password });
            await triggerOtp(email);
            navigate("/lender/otp");
        }
        catch (err) {
            setError("Unable to login with those credentials.");
        }
        finally {
            setIsSubmitting(false);
        }
    };
    return (_jsx("div", { className: "auth-page", children: _jsx(Card, { title: "Lender Login", children: _jsxs("form", { className: "auth-form", onSubmit: handleSubmit, children: [_jsx(Input, { label: "Email", name: "email", type: "email", required: true, autoComplete: "username", value: email, onChange: (e) => setEmail(e.target.value) }), _jsx(Input, { label: "Password", name: "password", type: "password", required: true, autoComplete: "current-password", value: password, onChange: (e) => setPassword(e.target.value) }), error && _jsx("div", { className: "auth-form__error", children: error }), _jsx(Button, { type: "submit", disabled: isSubmitting, children: isSubmitting ? "Submitting code..." : "Login" })] }) }) }));
};
export default LenderLoginPage;
