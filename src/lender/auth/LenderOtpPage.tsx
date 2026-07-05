// BF_PORTAL_LENDER_OTP_RESTYLE_v1 - lender OTP code entry, styled to match the
// staff Verify.tsx. The 6-digit code auto-forwards (auto-submits) on the sixth
// digit. Verify posts userType:"lender" so the server mints a lender token; on
// success we go to the lender dashboard. A 403 means the phone is not attached
// to any active BF lender.
import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { API_BASE } from "@/config/api";
import logoUrl from "@/assets/logo-boreal-mountains-white.svg";

const LenderOtpPage = () => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);
  const lastSubmittedRef = useRef<string | null>(null);

  const phone = typeof window !== "undefined" ? localStorage.getItem("lender_auth_phone") : null;

  // Auto-forward: submit as soon as 6 digits are entered.
  useEffect(() => {
    if (!phone) return;
    if (code.length !== 6) return;
    if (inFlightRef.current || lastSubmittedRef.current === code) return;

    const verify = async () => {
      inFlightRef.current = true;
      lastSubmittedRef.current = code;
      setError(null);
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/auth/otp/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ phone, code, userType: "lender" }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const err = String((data as { error?: string })?.error ?? "");
          setError(err === "no_lender_for_phone"
            ? "This number isn't registered as a lender. Contact Boreal to get set up."
            : "Invalid or expired code. Please try again.");
          setCode("");
          lastSubmittedRef.current = null;
          setLoading(false);
          return;
        }
        // The phone-OTP verify returns a lender JWT. Persist it in the lender
        // auth context's storage shape so LenderAuthProvider hydrates the
        // profile (/lender/auth/me) and the private-route guard passes. A hard
        // navigation remounts the provider so it reads the fresh token.
        const d = (data as { data?: { token?: string; refreshToken?: string }; token?: string; refreshToken?: string });
        const accessToken = d?.data?.token ?? d?.token ?? "";
        const refreshToken = d?.data?.refreshToken ?? d?.refreshToken ?? accessToken;
        if (accessToken) {
          sessionStorage.setItem("lender-portal.auth", JSON.stringify({ tokens: { accessToken, refreshToken }, user: null }));
        }
        window.location.href = "/lender/dashboard";
      } catch {
        setError("Unable to verify the code. Please try again.");
        setCode("");
        lastSubmittedRef.current = null;
        setLoading(false);
      } finally {
        inFlightRef.current = false;
      }
    };
    void verify();
  }, [code, phone]);

  if (!phone) return <Navigate to="/lender/login" replace />;

  const resend = async () => {
    setError(null);
    try {
      await fetch(`${API_BASE}/api/auth/otp/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone }),
      });
    } catch { /* best-effort */ }
  };

  return (
    <div data-testid="lender-verify-screen" className="min-h-screen w-screen flex items-center justify-center bg-[#020817] px-4 py-12">
      <div className="w-full max-w-md flex flex-col items-center gap-6">
        <div className="text-center">
          <img src={logoUrl} alt="Boreal" style={{ display: "block", margin: "0 auto 16px", height: 56, width: "auto" }} />
          <h1 className="text-2xl font-semibold text-white">Boreal Financial Group</h1>
          <p className="mt-1 text-sm font-medium text-white/70">Lender Portal</p>
        </div>
        <div className="w-full bg-white border border-slate-200 rounded-xl p-6 shadow-md">
          <label htmlFor="lender-verify-code" className="block text-sm text-slate-700 mb-1.5">Verification code</label>
          <input
            id="lender-verify-code"
            data-testid="lender-code-input"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="Enter code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            maxLength={6}
            disabled={loading}
            autoFocus
            className="w-full px-3.5 py-3 text-base text-slate-900 bg-white border border-slate-300 rounded-lg mb-3 box-border text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-60"
          />
          <p className="text-xs text-slate-500 mt-1 mb-2 text-center">Enter the 6-digit code we texted you.</p>
          {error ? (
            <div className="flex flex-col items-center gap-1">
              <p className="text-xs text-red-600 text-center max-w-xs" role="alert">{error}</p>
              <button type="button" className="text-xs text-blue-500 underline mt-1" onClick={() => void resend()}>Resend code</button>
            </div>
          ) : (
            <div className="text-center">
              <button type="button" className="text-xs text-blue-500 underline" onClick={() => void resend()}>Resend code</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LenderOtpPage;
