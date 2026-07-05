// BF_PORTAL_LENDER_PORTAL_RESTYLE_v1 - the REAL lender login (routed at
// /lender-portal/login via App.tsx). Restyled to match the staff portal
// (navy #020817 bg, white card, amber CTA, Boreal logo) with the header
// "Boreal Financial Group" / "Lender Portal". Phone auto-formats and
// auto-forwards (sends the code once a valid +1########## is entered); the
// 6-digit code auto-forwards (verifies) on the sixth digit. All auth logic
// (phone-OTP, userType:"lender", sessionStorage tokens, navigate to
// /lender-portal) is unchanged.
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api";
import logoUrl from "@/assets/logo-boreal-mountains-white.svg";

function normalizeNAPhone(value: string): string | null {
  const digits = (value || "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return null;
}

export default function LenderLoginPage() {
  const [step, setStep] = useState<"enter" | "verify">("enter");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const navigate = useNavigate();
  const autoSentFor = useRef<string | null>(null);
  const autoVerifiedFor = useRef<string | null>(null);

  const normalizedPhone = normalizeNAPhone(phone);

  async function sendCode(explicit?: string) {
    const target = explicit ?? normalizedPhone;
    if (!target) { setErr("Enter a valid mobile number."); return; }
    setLoading(true);
    setErr(null);
    try {
      await api("/api/auth/otp/start", {
        method: "POST",
        body: JSON.stringify({ phone: target, userType: "lender" }),
      });
      setPhone(target);
      setStep("verify");
    } catch (e) {
      autoSentFor.current = null;
      setErr(e instanceof Error ? e.message : "Failed to send code");
    } finally {
      setLoading(false);
    }
  }

  async function verify(explicitCode?: string) {
    const c = explicitCode ?? code;
    setLoading(true);
    setErr(null);
    try {
      const r = await api<{
        token: string;
        user: { id: string; name: string | null; email: string | null; phone: string; userType: string };
        profileComplete?: boolean;
      }>("/api/auth/otp/verify", {
        method: "POST",
        body: JSON.stringify({ phone, code: c, userType: "lender" }), // BF_SERVER_LENDER_OTP_v1
      });
      sessionStorage.setItem("lender_token", r.token);
      sessionStorage.setItem("lender_user", JSON.stringify(r.user));
      navigate("/lender-portal"); // LENDER_PORTAL_ONE_PAGE_v1
    } catch (e) {
      autoVerifiedFor.current = null;
      setCode("");
      const msg = e instanceof Error ? e.message : "Invalid code";
      setErr(/no_lender_for_phone/.test(msg)
        ? "This number isn't registered as a lender. Contact Boreal to get set up."
        : "Invalid or expired code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Auto-forward: send the code once a valid phone is entered.
  useEffect(() => {
    if (step !== "enter" || !normalizedPhone || loading) return;
    if (autoSentFor.current === normalizedPhone) return;
    autoSentFor.current = normalizedPhone;
    const t = window.setTimeout(() => { void sendCode(normalizedPhone); }, 350);
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
    <div data-testid="lender-login-screen" className="min-h-screen w-screen flex items-center justify-center bg-[#020817] px-4 py-12">
      <div className="w-full max-w-md flex flex-col items-center gap-6">
        <div className="text-center">
          <img src={logoUrl} alt="Boreal" style={{ display: "block", margin: "0 auto 16px", height: 56, width: "auto" }} />
          <h1 className="text-2xl font-semibold text-white">Boreal Financial Group</h1>
          <p className="mt-1 text-sm font-medium text-white/70">Lender Portal</p>
        </div>

        <div className="w-full bg-white border border-slate-200 rounded-xl p-6 shadow-md">
          {step === "enter" ? (
            <>
              <label htmlFor="lender-phone" className="block text-sm text-slate-700 mb-1.5">Mobile phone number</label>
              <input
                id="lender-phone"
                data-testid="lender-phone-input"
                type="tel"
                inputMode="tel"
                autoComplete="off"
                autoFocus
                placeholder="(555) 000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-3 text-base text-slate-900 bg-white border border-slate-300 rounded-lg mb-3 box-border focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              {err && <p className="text-sm text-red-700 mb-2" role="alert">{err}</p>}
              <button
                data-testid="lender-send-code"
                type="button"
                disabled={loading || !normalizedPhone}
                onClick={() => void sendCode()}
                className="w-full py-3.5 px-5 text-[17px] font-bold text-slate-900 bg-amber-500 hover:bg-amber-600 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Sending..." : "Send code"}
              </button>
              <p className="text-xs text-slate-500 mt-2.5 mb-0 text-center">We{"'"}ll text you a one-time code to log in.</p>
            </>
          ) : (
            <>
              <label htmlFor="lender-code" className="block text-sm text-slate-700 mb-1.5">Verification code</label>
              <input
                id="lender-code"
                data-testid="lender-code-input"
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
              <p className="text-xs text-slate-500 mt-1 mb-2 text-center">Enter the 6-digit code we texted to {phone}.</p>
              {err && <p className="text-sm text-red-700 mb-2 text-center" role="alert">{err}</p>}
              <button
                type="button"
                className="text-xs text-blue-600 underline w-full text-center"
                onClick={() => { setStep("enter"); setCode(""); setErr(null); autoSentFor.current = null; }}
              >
                Change number
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
