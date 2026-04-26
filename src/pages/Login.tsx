import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { normalizePhone } from "@/utils/normalizePhone";
import { clearOtpFlowState, setOtpStartRequested, setOtpStartSucceeded } from "@/auth/otpFlow";
import { API_BASE } from "@/config/api";

type StartError = string | null;

function normalizeNorthAmericanPhone(value: string): string | null {
  try {
    const normalized = normalizePhone(value);
    return /^\+1\d{10}$/.test(normalized) ? normalized : null;
  } catch {
    return null;
  }
}

export default function Login() {
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<StartError>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    clearOtpFlowState();
  }, []);

  // Auto-submit when the phone is fully entered and valid.
  // Debounce by 350ms so the request doesn't fire mid-typing on
  // pasted numbers or partial entries.
  useEffect(() => {
    // Compute inline to avoid TDZ on any later-declared `normalizedPhone` const.
    const digits = (phone || "").replace(/\D/g, "");
    const normalized =
      digits.length === 11 && digits.startsWith("1")
        ? `+${digits}`
        : digits.length === 10
          ? `+1${digits}`
          : "";
    if (!normalized) return;
    if (isSubmitting) return;
    const t = window.setTimeout(() => {
      void handleStartOTP(undefined, normalized);
    }, 350);
    return () => window.clearTimeout(t);
  }, [phone, isSubmitting]); // eslint-disable-line react-hooks/exhaustive-deps

  const normalizedPhone = useMemo(() => normalizeNorthAmericanPhone(phone), [phone]);

  const handleStartOTP = async (
    event?: FormEvent<HTMLFormElement>,
    explicitPhone?: string,
  ) => {
    event?.preventDefault();
    const targetPhone = explicitPhone ?? normalizedPhone;

    if (!targetPhone || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setOtpStartRequested();

    try {
      const res = await fetch(`${API_BASE}/api/auth/otp/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone: targetPhone }),
      });

      if (!res.ok) {
        throw new Error("OTP start failed");
      }

      localStorage.setItem("auth_phone", targetPhone);
      setOtpStartSucceeded(targetPhone);
      navigate("/verify");
    } catch {
      clearOtpFlowState();
      setError("Unable to start OTP. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div data-testid="login-screen" className="h-screen w-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-6">
        <h1 className="text-2xl font-semibold text-black text-center">
          Boreal Group of Companies Staff Portal
        </h1>

        <form className="flex flex-col items-center gap-3" onSubmit={handleStartOTP}>
          <input
            data-testid="phone-input"
            type="tel"
            placeholder="Enter phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="border border-gray-300 rounded-md px-4 py-3 text-lg w-72 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <button
            data-testid="start-otp-button"
            type="submit"
            disabled={!normalizedPhone || isSubmitting}
            className="w-72 rounded-md bg-blue-600 px-4 py-3 text-white disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {isSubmitting ? "Sending..." : normalizedPhone ? "Sending code…" : "Send code"}
          </button>
        </form>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    </div>
  );
}
