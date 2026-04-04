import { useState } from "react";

import { sendOtp, verifyOtp } from "../../api/auth";
import { setToken } from "../../lib/authToken";

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [error, setError] = useState("");

  async function handleSendOtp() {
    try {
      setError("");
      await sendOtp(phone);
      setStep("code");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send OTP");
    }
  }

  async function handleVerifyOtp() {
    try {
      setError("");
      const res = await verifyOtp(phone, code);
      setToken(res.token);
      window.location.href = "/";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to verify OTP");
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Login</h2>

      {step === "phone" && (
        <>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" />
          <button onClick={handleSendOtp}>Send OTP</button>
        </>
      )}

      {step === "code" && (
        <>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code" />
          <button onClick={handleVerifyOtp}>Verify</button>
        </>
      )}

      {error && <div style={{ color: "red" }}>{error}</div>}
    </div>
  );
}
