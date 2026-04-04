import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { sendOtp, verifyOtp } from "../../api/auth";
import { authToken } from "../../lib/authToken";

export default function LoginPage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
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
    } catch {
      setError("Failed to send OTP.");
    } finally {
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
    } catch {
      setError("Failed to verify OTP.");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Login</h2>

      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Phone"
        disabled={sending || verifying}
      />
      <button onClick={handleSendOtp} disabled={sending || verifying}>
        {sending ? "Sending..." : "Send OTP"}
      </button>

      {step === "code" && (
        <>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Code"
            disabled={sending || verifying}
          />
          <button onClick={handleVerifyOtp} disabled={sending || verifying}>
            {verifying ? "Verifying..." : "Verify OTP"}
          </button>
        </>
      )}

      {error && <div style={{ color: "red" }}>{error}</div>}
    </div>
  );
}
