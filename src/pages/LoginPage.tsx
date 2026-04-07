import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { sendOtp, verifyOtp } from "@/api/auth";
import { authToken } from "@/lib/authToken";

export default function LoginPage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSendOtp() {
    if (loading) return;

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
    } catch (e: any) {
      setError(e?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    if (loading) return;

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
    } catch (e: any) {
      setError(e?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Login</h2>

      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Phone"
        disabled={loading || step === "code"}
      />
      <button onClick={handleSendOtp} disabled={loading || step === "code"}>
        {loading && step === "phone" ? "Sending..." : "Send OTP"}
      </button>

      {step === "code" && (
        <>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Code"
            disabled={loading}
          />
          <button onClick={handleVerifyOtp} disabled={loading}>
            {loading ? "Verifying..." : "Verify OTP"}
          </button>
        </>
      )}

      {error && <div style={{ color: "red" }}>{error}</div>}
    </div>
  );
}
