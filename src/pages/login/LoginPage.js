import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { sendOtp, verifyOtp } from "../../api/auth";
import { setToken } from "../../lib/authToken";
export default function LoginPage() {
    const [phone, setPhone] = useState("");
    const [code, setCode] = useState("");
    const [step, setStep] = useState("phone");
    const [error, setError] = useState("");
    async function handleSendOtp() {
        try {
            setError("");
            await sendOtp(phone);
            setStep("code");
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Failed to send OTP");
        }
    }
    async function handleVerifyOtp() {
        try {
            setError("");
            const res = await verifyOtp(phone, code);
            setToken(res.token);
            window.location.href = "/";
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Failed to verify OTP");
        }
    }
    return (_jsxs("div", { style: { padding: 24 }, children: [_jsx("h2", { children: "Login" }), step === "phone" && (_jsxs(_Fragment, { children: [_jsx("input", { value: phone, onChange: (e) => setPhone(e.target.value), placeholder: "Phone" }), _jsx("button", { onClick: handleSendOtp, children: "Send OTP" })] })), step === "code" && (_jsxs(_Fragment, { children: [_jsx("input", { value: code, onChange: (e) => setCode(e.target.value), placeholder: "Code" }), _jsx("button", { onClick: handleVerifyOtp, children: "Verify" })] })), error && _jsx("div", { style: { color: "red" }, children: error })] }));
}
