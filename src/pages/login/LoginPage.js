import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { sendOtp, verifyOtp } from "../../api/auth";
import { authToken } from "../../lib/authToken";
export default function LoginPage() {
    const navigate = useNavigate();
    const [phone, setPhone] = useState("");
    const [code, setCode] = useState("");
    const [step, setStep] = useState("phone");
    const [error, setError] = useState("");
    const [sending, setSending] = useState(false);
    const [verifying, setVerifying] = useState(false);
    async function handleSendOtp() {
        if (!phone.trim()) {
            setError("Phone number is required.");
            return;
        }
        try {
            setError("");
            setSending(true);
            await sendOtp(phone.trim());
            setStep("code");
        }
        catch {
            setError("Failed to send OTP.");
        }
        finally {
            setSending(false);
        }
    }
    async function handleVerifyOtp() {
        if (!code.trim()) {
            setError("OTP code is required.");
            return;
        }
        try {
            setError("");
            setVerifying(true);
            const res = await verifyOtp(phone.trim(), code.trim());
            authToken.set(res.token);
            navigate("/", { replace: true });
        }
        catch {
            setError("Failed to verify OTP.");
        }
        finally {
            setVerifying(false);
        }
    }
    return (_jsxs("div", { style: { padding: 24 }, children: [_jsx("h2", { children: "Login" }), _jsx("input", { value: phone, onChange: (e) => setPhone(e.target.value), placeholder: "Phone", disabled: sending || verifying }), _jsx("button", { onClick: handleSendOtp, disabled: sending || verifying, children: sending ? "Sending..." : "Send OTP" }), step === "code" && (_jsxs(_Fragment, { children: [_jsx("input", { value: code, onChange: (e) => setCode(e.target.value), placeholder: "Code", disabled: sending || verifying }), _jsx("button", { onClick: handleVerifyOtp, disabled: sending || verifying, children: verifying ? "Verifying..." : "Verify OTP" })] })), error && _jsx("div", { style: { color: "red" }, children: error })] }));
}
