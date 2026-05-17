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
    <div data-testid="verify-screen" className="min-h-screen w-screen flex items-center justify-center bg-[#020817] px-4 py-12">
      <div className="w-full max-w-md flex flex-col items-center gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-white">Boreal Group of Companies</h1>
          <p className="mt-1 text-sm font-medium text-white/70">Staff Portal</p>
        </div>
        <div className="w-full bg-white border border-slate-200 rounded-xl p-6 shadow-md">
          <label htmlFor="staff-verify-code" className="block text-sm text-slate-700 mb-1.5">Verification code</label>
        <input
          data-testid="code-input"
          type="text"
          placeholder="Enter code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          maxLength={6}
          disabled={loading}
          id="staff-verify-code"
          className="w-full px-3.5 py-3 text-base text-slate-900 bg-white border border-slate-300 rounded-lg mb-3 box-border text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-60"
        />
        {error ? (
          <div className="flex flex-col items-center gap-1">
            <p className="text-xs text-red-600 text-center max-w-xs">{error}</p>
            {error.includes("administrator") ? (
              <button
                type="button"
                className="text-xs text-blue-500 underline mt-1"
                onClick={() => {
                  window.location.href = "/login";
                }}
              >
                Back to login
              </button>
            ) : null}
          </div>
        ) : null}
        </div>
      </div>
    </div>
  );
}
