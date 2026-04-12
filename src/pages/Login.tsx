import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { normalizePhone } from "@/utils/normalizePhone";
import { clearOtpFlowState, setOtpStartRequested, setOtpStartSucceeded } from "@/auth/otpFlow";

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
  const navigate = useNavigate();
  const lastSubmittedPhoneRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);

  useEffect(() => {
    clearOtpFlowState();
  }, []);

  const normalizedPhone = useMemo(() => normalizeNorthAmericanPhone(phone), [phone]);

  useEffect(() => {
    if (!normalizedPhone) {
      lastSubmittedPhoneRef.current = null;
      return;
    }

    if (inFlightRef.current || lastSubmittedPhoneRef.current === normalizedPhone) {
      return;
    }

    const sendOtp = async () => {
      inFlightRef.current = true;
      lastSubmittedPhoneRef.current = normalizedPhone;
      setError(null);
      setOtpStartRequested();

      try {
        const response = await fetch("/api/auth/otp/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: normalizedPhone }),
        });

        if (!response.ok) {
          clearOtpFlowState();
          if (response.status === 405) {
            setError("OTP start is unavailable right now. Please try again later.");
            return;
          }
          if (response.status === 400 || response.status === 401) {
            setError("Unable to start OTP with that phone number.");
            return;
          }
          setError("Unable to start OTP. Please try again.");
          return;
        }

        setOtpStartSucceeded(normalizedPhone);
        navigate("/verify", { replace: true });
      } catch {
        clearOtpFlowState();
        setError("Unable to start OTP. Please try again.");
      } finally {
        inFlightRef.current = false;
      }
    };

    void sendOtp();
  }, [navigate, normalizedPhone]);

  return (
    <div data-testid="login-screen" className="h-screen w-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-6">
        <h1 className="text-2xl font-semibold text-black text-center">
          Boreal Group of Companies Staff Portal
        </h1>

        <input
          data-testid="phone-input"
          type="tel"
          placeholder="Enter phone number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="border border-gray-300 rounded-md px-4 py-3 text-lg w-72 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    </div>
  );
}
