import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { getOtpFlowState, hasPendingOtpVerification } from "@/auth/otpFlow";
import { verifyOtp } from "@/auth/verify";

export default function Verify() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastSubmittedCodeRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);

  if (!hasPendingOtpVerification()) {
    return <Navigate to="/login" replace />;
  }

  const phone = getOtpFlowState().pendingPhone;

  useEffect(() => {
    if (!phone || code.length !== 6) return;
    if (inFlightRef.current || lastSubmittedCodeRef.current === code) return;

    const handleVerify = async () => {
      inFlightRef.current = true;
      lastSubmittedCodeRef.current = code;
      setError(null);
      setLoading(true);

      try {
        const result = await verifyOtp(code);
        setLoading(false);

        if (!result.success) {
          setError(result.error || "Unable to verify code");
          setCode("");
          lastSubmittedCodeRef.current = null;
          return;
        }

        window.location.href = "/dashboard";
      } catch {
        setError("Unable to verify code");
        setCode("");
        lastSubmittedCodeRef.current = null;
        setLoading(false);
      } finally {
        inFlightRef.current = false;
      }
    };

    void handleVerify();
  }, [code, phone]);

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
          disabled={loading}
          className="border border-gray-300 rounded-md px-4 py-3 text-lg w-48 text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {error ? <p className="text-xs text-red-600">{error}</p> : null}
      </div>
    </div>
  );
}
