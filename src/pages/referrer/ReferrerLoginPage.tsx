// BF_PORTAL_REFERRER_BRAND_v1
// The referrer login now matches the Boreal external-portal shell used by the lender portal
// (navy #020817 background, white card, Boreal mark, amber CTA) instead of an unthemed card
// that looked like a stray page. Auto-forwards on both steps: sends the code once a valid
// North-American number is entered (short debounce, button retained), and verifies once the
// 6th digit of the OTP lands. +1 only - US/Canada are the only permitted countries.
import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "@/api";
import logoUrl from "@/assets/logo-boreal-mountains-white.svg";

function normalizeNAPhone(value: string): string | null {
  const digits = (value || "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return null;
}

export default function ReferrerLoginPage() {
  const [step, setStep] = useState<"enter" | "verify">("enter");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const navigate = useNavigate();
  const autoSentFor = useRef<string | null>(null);
  const autoVerifiedFor = useRef<string | null>(null);
  const normalizedPhone = normalizeNAPhone(phone);

  async function sendCode(target?: string) {
    const e164 = target ?? normalizedPhone;
    if (!e164) {
      setErr("Enter a valid mobile number.");
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      await api("/api/auth/otp/start", {
        method: "POST",
        body: JSON.stringify({ phone: e164, userType: "referrer" }),
      });
      setStep("verify");
    } catch (e) {
      autoSentFor.current = null;
      setErr(e instanceof Error ? e.message : "Failed to send code");
    } finally {
      setLoading(false);
    }
  }

  async function verify(value?: string) {
    const otp = value ?? code;
    setLoading(true);
    setErr(null);
    try {
      const r = await api<{
        token: string;
        user: { id: string; name: string | null; email: string | null; phone: string; userType: string };
        profileComplete?: boolean;
      }>("/api/auth/otp/verify", {
        method: "POST",
        body: JSON.stringify({ phone: normalizedPhone ?? phone, code: otp, userType: "referrer" }), // REFERRER_BF_WIRING_v1
      });
      sessionStorage.setItem("referrer_token", r.token);
      sessionStorage.setItem("referrer_user", JSON.stringify(r.user));
      navigate(r.profileComplete === false ? "/referrer/profile" : "/referrer");
    } catch (e) {
      // BF_PORTAL_REFERRER_UNIFY_UI_v1 - do NOT reset autoVerifiedFor here; a
      // failed code must not auto-retry (that caused the 401 loop). The
      // "=== code" guard already re-enables verify when the code changes.
      setErr(e instanceof Error ? e.message : "Invalid code");
    } finally {
      setLoading(false);
    }
  }

  // BF_PORTAL_REFERRER_OTP_GUARD_v1 - a signed-in referrer must NEVER be sent OTP codes.
  // If a referrer token already exists, go straight to the portal instead of the login
  // (which auto-sends a code on mount).
  useEffect(() => {
    if (sessionStorage.getItem("referrer_token")) navigate("/referrer", { replace: true });
  }, [navigate]);

  // Auto-forward: send the code once a valid phone is entered. Short debounce so it does not
  // fire mid-keystroke; the button stays visible so nothing feels hijacked.
  useEffect(() => {
    if (sessionStorage.getItem("referrer_token")) return; // BF_PORTAL_REFERRER_OTP_GUARD_v1
    if (step !== "enter" || !normalizedPhone || loading) return;
    if (autoSentFor.current === normalizedPhone) return;
    autoSentFor.current = normalizedPhone;
    const t = window.setTimeout(() => { void sendCode(normalizedPhone); }, 600);
    return () => window.clearTimeout(t);
  }, [phone, step, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-forward: verify once 6 digits are entered.
  useEffect(() => {
    if (step !== "verify" || code.length !== 6 || loading) return;
    if (autoVerifiedFor.current === code) return;
    autoVerifiedFor.current = code;
    void verify(code);
  }, [code, step, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div data-testid="referrer-login-screen" className="min-h-screen w-screen flex items-center justify-center bg-[#020817] px-4 py-12">
      <div className="w-full max-w-md flex flex-col items-center gap-6">
        <div className="text-center">
          <img src={logoUrl} alt="Boreal" style={{ display: "block", margin: "0 auto 18px", height: 88, width: "auto" }} />
          <h1 className="text-2xl font-semibold text-white">Boreal Financial Group</h1>
          <p className="mt-1 text-sm font-medium text-white/70">Referral Portal</p>
        </div>

        <div className="w-full bg-white border border-slate-200 rounded-xl p-6 shadow-md">
          <p className="text-sm text-slate-700 mb-4 text-center">
            Welcome to the Boreal Financial Group Referral Portal. If this is your first visit, please click the{" "}
            <Link to="/referrer/signup" className="font-semibold text-blue-700 underline">Sign up</Link> link.
          </p>

          {step === "enter" ? (
            <>
              <label htmlFor="referrer-phone" className="block text-sm text-slate-700 mb-1.5">Mobile phone number</label>
              <input
                id="referrer-phone"
                data-testid="referrer-phone-input"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                autoFocus
                placeholder="(555) 000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-3 text-base text-slate-900 bg-white border border-slate-300 rounded-lg mb-3 box-border focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              {err && <p className="text-sm text-red-700 mb-2" role="alert">{err}</p>}
              <button
                data-testid="referrer-send-code"
                type="button"
                disabled={loading || !normalizedPhone}
                onClick={() => void sendCode()}
                className="w-full py-3.5 px-5 text-[17px] font-bold text-slate-900 bg-amber-500 hover:bg-amber-600 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Sending..." : "Send code"}
              </button>
              <p className="text-xs text-slate-500 mt-2.5 mb-0 text-center">
                Sign in with the mobile number on your referral agreement. We{"'"}ll text you a one-time code.
              </p>
            </>
          ) : (
            <>
              <label htmlFor="referrer-code" className="block text-sm text-slate-700 mb-1.5">Verification code</label>
              <input
                id="referrer-code"
                data-testid="referrer-code-input"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                placeholder="Enter code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                disabled={loading}
                className="w-full px-3.5 py-3 text-base text-slate-900 bg-white border border-slate-300 rounded-lg mb-3 box-border text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-60"
              />
              <p className="text-xs text-slate-500 mt-1 mb-2 text-center">Enter the 6-digit code we texted to {normalizedPhone ?? phone}.</p>
              {err && <p className="text-sm text-red-700 mb-2 text-center" role="alert">{err}</p>}
              <button
                data-testid="referrer-verify"
                type="button"
                disabled={loading || code.length !== 6}
                onClick={() => void verify()}
                className="w-full py-3.5 px-5 text-[17px] font-bold text-slate-900 bg-amber-500 hover:bg-amber-600 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Verifying..." : "Verify"}
              </button>
              <button
                type="button"
                className="text-xs text-blue-600 underline w-full text-center mt-3"
                onClick={() => { setStep("enter"); setCode(""); setErr(null); autoSentFor.current = null; autoVerifiedFor.current = null; }}
              >
                Change number
              </button>
            </>
          )}
        </div>

        <p className="text-xs text-white/50 text-center">
          Boreal Financial Group &middot; 450 Sparling Crt SW, Edmonton, AB T6X 1G9
        </p>
      </div>
    </div>
  );
}
