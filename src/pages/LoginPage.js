import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { sendOtp, verifyOtp } from "@/api/auth";
import { authToken } from "@/lib/authToken";
export default function LoginPage() {
    const navigate = useNavigate();
    const [phone, setPhone] = useState("");
    const [code, setCode] = useState("");
    const [step, setStep] = useState("phone");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    async function handleSendOtp() {
        if (loading)
            return;
        const normalizedPhone = phone.replace(/\D/g, "");
        if (normalizedPhone.length < 10) {
            setError("Invalid phone number");
            return;
        }
        setLoading(true);
        try {
            setError("");
            await sendOtp(normalizedPhone);
            setPhone(normalizedPhone);
            setStep("code");
        }
        catch (e) {
            setError(e?.message || "Failed to send OTP");
        }
        finally {
            setLoading(false);
        }
    }
    async function handleVerifyOtp() {
        if (loading)
            return;
        if (!/^\d{6}$/.test(code.trim())) {
            setError("Enter valid 6-digit code");
            return;
        }
        setLoading(true);
        try {
            setError("");
            const res = await verifyOtp(phone, code.trim());
            authToken.set(res.token);
            navigate("/", { replace: true });
        }
        catch (e) {
            setError(e?.message || "Verification failed");
        }
        finally {
            setLoading(false);
        }
    }
    return (_jsxs("div", { style: { padding: 24 }, children: [_jsx("h2", { children: "Login" }), _jsx("input", { value: phone, onChange: (e) => setPhone(e.target.value), placeholder: "Phone", disabled: loading || step === "code" }), _jsx("button", { onClick: handleSendOtp, disabled: loading || step === "code", children: loading && step === "phone" ? "Sending..." : "Send OTP" }), step === "code" && (_jsxs(_Fragment, { children: [_jsx("input", { value: code, onChange: (e) => setCode(e.target.value), placeholder: "Code", disabled: loading }), _jsx("button", { onClick: handleVerifyOtp, disabled: loading, children: loading ? "Verifying..." : "Verify OTP" })] })), error && _jsx("div", { style: { color: "red" }, children: error })] }));
}
