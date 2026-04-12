import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { getOtpFlowState, hasPendingOtpVerification } from "@/auth/otpFlow";
import { setAuthToken } from "@/lib/authToken";

export default function Verify() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const lastSubmittedCodeRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);

  if (!hasPendingOtpVerification()) {
    return <Navigate to="/login" replace />;
  }

  const phone = getOtpFlowState().pendingPhone;

  useEffect(() => {
    if (!phone || code.length !== 6) return;
    if (inFlightRef.current || lastSubmittedCodeRef.current === code) return;

    const verifyOtp = async () => {
      inFlightRef.current = true;
      lastSubmittedCodeRef.current = code;
      setError(null);

      try {
        const res = await fetch("/api/auth/otp/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, code }),
        });

        if (!res.ok) {
          if (res.status === 400 || res.status === 401) {
            setError("Invalid code. Please try again.");
          } else {
            setError("Unable to verify code right now.");
          }
          setCode("");
          lastSubmittedCodeRef.current = null;
          return;
        }

        const data = (await res.json()) as { token?: string };
        if (!data.token) {
          setError("Unable to verify code right now.");
          setCode("");
          lastSubmittedCodeRef.current = null;
          return;
        }

        setAuthToken(data.token);
        navigate("/portal", { replace: true });
      } catch {
        setError("Unable to verify code right now.");
        setCode("");
        lastSubmittedCodeRef.current = null;
      } finally {
        inFlightRef.current = false;
      }
    };

    void verifyOtp();
  }, [code, navigate, phone]);

  return (
    <div data-testid="verify-screen" className="h-screen w-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-2">
        <input
          data-testid="code-input"
          type="text"
          placeholder="Enter code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          maxLength={6}
          className="border border-gray-300 rounded-md px-4 py-3 text-lg w-48 text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {error ? <p className="text-xs text-red-600">{error}</p> : null}
      </div>
    </div>
  );
}
