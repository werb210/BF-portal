// BF_PORTAL_LENDER_OTP_RESTYLE_v1 - lender portal phone-OTP login, styled to
// match the staff Login.tsx (navy bg, white card, amber CTA, Boreal logo).
// The live lender login is phone-based and shares the staff OTP endpoints; on
// verify we send userType:"lender" so the server (BF_SERVER_LENDER_OTP_v1)
// matches the phone to a BF lender and mints a lender token. Phone auto-formats
// and auto-forwards (fires OTP start) once a valid +1########## is entered.
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { normalizePhone } from "@/utils/normalizePhone";
import { API_BASE } from "@/config/api";
import logoUrl from "@/assets/logo-boreal-mountains-white.svg";

function normalizeNorthAmericanPhone(value: string): string | null {
  try {
    const normalized = normalizePhone(value);
    return /^\+1\d{10}$/.test(normalized) ? normalized : null;
  } catch {
    return null;
  }
}

function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

const LenderLoginPage = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const autoFiredFor = useRef<string | null>(null);

  const normalizedPhone = useMemo(() => normalizeNorthAmericanPhone(phone), [phone]);

  const startOtp = async (event?: FormEvent<HTMLFormElement>, explicitPhone?: string) => {
    event?.preventDefault();
    const targetPhone = explicitPhone ?? normalizedPhone;
    if (!targetPhone || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/otp/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone: targetPhone }),
      });
      if (!res.ok) throw new Error("OTP start failed");
      localStorage.setItem("lender_auth_phone", targetPhone);
      navigate("/lender/otp");
    } catch {
      autoFiredFor.current = null;
      setError("Unable to send the code. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-forward: once a valid +1########## is entered, fire OTP start.
  useEffect(() => {
    const digits = (phone || "").replace(/\D/g, "");
    const normalized =
      digits.length === 11 && digits.startsWith("1") ? `+${digits}`
      : digits.length === 10 ? `+1${digits}` : "";
    if (!normalized) return;
    if (isSubmitting) return;
    if (autoFiredFor.current === normalized) return;
    autoFiredFor.current = normalized;
    const t = window.setTimeout(() => { void startOtp(undefined, normalized); }, 350);
    return () => window.clearTimeout(t);
  }, [phone, isSubmitting]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div data-testid="lender-login-screen" className="min-h-screen w-screen flex items-center justify-center bg-[#020817] px-4 py-12">
      <div className="w-full max-w-md flex flex-col items-center gap-6">
        <div className="text-center">
          <img src={logoUrl} alt="Boreal" style={{ display: "block", margin: "0 auto 16px", height: 56, width: "auto" }} />
          <h1 className="text-2xl font-semibold text-white">Boreal Financial Group</h1>
          <p className="mt-1 text-sm font-medium text-white/70">Lender Portal</p>
        </div>
        <form className="w-full bg-white border border-slate-200 rounded-xl p-6 shadow-md" onSubmit={startOtp}>
          <label htmlFor="lender-login-phone" className="block text-sm text-slate-700 mb-1.5">Mobile phone number</label>
          <input
            id="lender-login-phone"
            data-testid="lender-phone-input"
            type="text"
            inputMode="tel"
            name="otp-phone"
            autoComplete="off"
            autoFocus
            placeholder="(555) 000-0000"
            value={phone}
            onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
            className="w-full px-3.5 py-3 text-base text-slate-900 bg-white border border-slate-300 rounded-lg mb-3 box-border focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          {error ? <p className="text-sm text-red-700 mb-2" role="alert">{error}</p> : null}
          <button
            data-testid="lender-start-otp-button"
            type="submit"
            disabled={!normalizedPhone || isSubmitting}
            className="w-full py-3.5 px-5 text-[17px] font-bold text-slate-900 bg-amber-500 hover:bg-amber-600 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Sending..." : "Send code"}
          </button>
          <p className="text-xs text-slate-500 mt-2.5 mb-0 text-center">We{"'"}ll text you a one-time code to log in.</p>
        </form>
      </div>
    </div>
  );
};

export default LenderLoginPage;
