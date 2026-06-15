import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { normalizePhone } from "@/utils/normalizePhone";
import { clearOtpFlowState, setOtpStartRequested, setOtpStartSucceeded } from "@/auth/otpFlow";
import { API_BASE } from "@/config/api";
import logoUrl from "@/assets/logo-boreal-mountains-white.svg";
import { loginWithPasskey, passkeysSupported } from "@/auth/passkey"; // BF_PORTAL_WEBAUTHN_v1

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
  const autoFiredFor = useRef<string | null>(null);
  const navigate = useNavigate();
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const handlePasskeyLogin = async () => {
    setError(null);
    setPasskeyBusy(true);
    try {
      await loginWithPasskey();
      window.location.href = "/dashboard";
    } catch (e: any) {
      // BF_PORTAL_PASSKEY_ERROR_SURFACING_v1 — surface the real failure instead
      // of silently swallowing it. NotAllowedError/AbortError on a usernameless
      // get() almost always means "no discoverable passkey on this device".
      console.warn("[passkey] login failed", e?.name, e?.message);
      if (e?.name === "NotAllowedError" || e?.name === "AbortError") {
        setError("No passkey found on this device. Sign in with your phone number, then add a passkey from your Profile settings.");
      } else {
        setError("Passkey sign-in failed. Use your phone number instead.");
      }
    } finally {
      setPasskeyBusy(false);
    }
  };

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
    if (autoFiredFor.current === normalized) return;
    autoFiredFor.current = normalized;
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
      autoFiredFor.current = null;
      setError("Unable to start OTP. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    // BF_PORTAL_BLOCK_v210_STAFF_LOGIN_OTP_CONSISTENCY_v1 — page bg + card
    // pattern matches BF-Client PhoneOTPInline.tsx and BI-Website OTP screens
    // (BI_WEBSITE_BLOCK_v171_OTP_CONSISTENCY_v1). Same dark navy bg, white card,
    // amber CTA, helper line, "Mobile phone number" label.
    <div
      data-testid="login-screen"
      className="min-h-screen w-screen flex items-center justify-center bg-[#020817] px-4 py-12"
    >
      <div className="w-full max-w-md flex flex-col items-center gap-6">
        <div className="text-center">
          <img
            src={logoUrl}
            alt="Boreal"
            style={{ display: "block", margin: "0 auto 16px", height: 56, width: "auto" }}
          />
          {/* BF_PORTAL_BLOCK_v828_OTP_PAGE_PARITY — header identical to Verify.tsx */}
          <h1 className="text-2xl font-semibold text-white">Boreal Group of Companies</h1>
          <p className="mt-1 text-sm font-medium text-white/70">Staff Portal</p>
        </div>

        <form
          className="w-full bg-white border border-slate-200 rounded-xl p-6 shadow-md"
          onSubmit={handleStartOTP}
        >
          <label
            htmlFor="staff-login-phone"
            className="block text-sm text-slate-700 mb-1.5"
          >
            Mobile phone number
          </label>
          <input
            id="staff-login-phone"
            data-testid="phone-input"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            autoFocus
            placeholder="(555) 000-0000"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3.5 py-3 text-base text-slate-900 bg-white border border-slate-300 rounded-lg mb-3 box-border focus:outline-none focus:ring-2 focus:ring-amber-500"
          />

          {error ? (
            <p className="text-sm text-red-700 mb-2" role="alert">
              {error}
            </p>
          ) : null}

          <button
            data-testid="start-otp-button"
            type="submit"
            disabled={!normalizedPhone || isSubmitting}
            className="w-full py-3.5 px-5 text-[17px] font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Sending…" : "Send code →"}
          </button>

          <p className="text-xs text-slate-500 mt-2.5 mb-0 text-center">
            We{"'"}ll text you a one-time code to verify.
          </p>
        </form>
        {passkeysSupported() ? (
          <button
            type="button"
            data-testid="passkey-login-button"
            onClick={handlePasskeyLogin}
            disabled={passkeyBusy}
            className="w-full max-w-md py-3 px-5 text-[15px] font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg disabled:opacity-60"
          >
            {passkeyBusy ? "Waiting for passkey…" : "Sign in with a passkey"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
