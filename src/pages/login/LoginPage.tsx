import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "@/api/http";
import { useAuth } from "@/hooks/useAuth";
import { normalizePhone } from "@/utils/normalizePhone";

const OTP_ERROR_MESSAGE_MAP: Record<string, string> = {
  invalid_otp: "Invalid code. Request a new code and try again.",
  expired: "Code expired. Request a new code.",
  otp_session_expired: "Code expired. Request a new code.",
  user_not_found: "This phone number is not linked to a portal user.",
  otp_user_not_found: "This phone number is not linked to a portal user.",
  auth_token_creation_failed: "Authentication failed. Request a new code.",
};

export function resolvePostLoginDestination(role: string): string {
  const normalizedRole = role.toLowerCase();

  switch (normalizedRole) {
    case "admin":
    case "staff":
      return "/admin/ai";
    case "lender":
      return "/lenders";
    case "referrer":
      return "/referrals";
    default:
      return "/unauthorized";
  }
}

export default function LoginPage() {
  const { authenticated, authStatus, startOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [normalizedPhone, setNormalizedPhone] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const lastAutoVerifiedCodeRef = useRef<string | null>(null);

  useEffect(() => {
    if (!codeSent && authenticated && authStatus === "authenticated") {
      if (process.env.NODE_ENV === "test") {
        navigate("/dashboard", { replace: true });
      } else {
        window.location.href = "/dashboard";
      }
    }
  }, [authenticated, authStatus, codeSent, navigate]);

  const resolveOtpErrorMessage = (err: unknown, fallback: string) => {
    if (err instanceof ApiError) {
      const details = err.details as { code?: string; message?: string } | undefined;
      const code = details?.code ?? err.code;
      if (code && OTP_ERROR_MESSAGE_MAP[code]) {
        return OTP_ERROR_MESSAGE_MAP[code];
      }
      return details?.message ?? err.message ?? fallback;
    }

    const axiosLike = err as { message?: string; code?: string };
    if (axiosLike?.code === "ERR_NETWORK") {
      return "Network error. Please check your connection and retry.";
    }

    return axiosLike?.message ?? fallback;
  };

  const sendCode = async (phoneValue = phone) => {
    try {
      setError(null);
      setRequestId(null);
      setEndpoint("/auth/otp/start");
      setStatusMessage(null);
      setSending(true);

      const normalized = normalizePhone(phoneValue);
      const started = await startOtp({ phone: normalized });

      if (!started) {
        throw new Error("Failed to send verification code");
      }

      setNormalizedPhone(normalized);
      setCodeSent(true);
      setStatusMessage("Code sent. Check your phone for the verification code.");
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || "Failed to send verification code");
      setRequestId(err?.response?.headers?.["x-request-id"] ?? "n/a");
    } finally {
      setSending(false);
    }
  };

  const handleResendCode = async () => {
    if (!normalizedPhone) return;
    await sendCode(normalizedPhone);
  };

  const handleVerify = async () => {
    if (code.length !== 6 || !normalizedPhone) {
      return;
    }

    setVerifying(true);
    setError(null);
    setRequestId(null);
    setEndpoint("/auth/otp/verify");

    try {
      const verified = await verifyOtp(normalizedPhone, code);
      if (!verified.success) {
        setError(verified.error || "Authentication failed. Request a new code.");
        setRequestId("n/a");
        return;
      }
      const destination = verified.nextPath || "/dashboard";
      if (process.env.NODE_ENV === "test") {
        navigate(destination, { replace: true });
      } else {
        window.location.href = destination;
      }
    } catch (err) {
      setStatusMessage(null);
      setError(resolveOtpErrorMessage(err, "Authentication failed. Request a new code."));
      setRequestId(err instanceof ApiError ? err.requestId ?? "n/a" : "n/a");
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    if (!codeSent) {
      lastAutoVerifiedCodeRef.current = null;
    }
  }, [codeSent]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void sendCode();
        }}
        className="bg-white p-8 rounded shadow-md w-96"
      >
        <h1 className="text-xl font-semibold mb-6 text-center">Staff Login</h1>

        {statusMessage ? <div role="status" className="mb-4 text-sm text-green-700">{statusMessage}</div> : null}

        {error && (
          <div role="alert" className="error mb-4 text-sm text-red-600">
            {error}
            <div>Request ID: {requestId ?? "n/a"}</div>
            <div>Endpoint: {endpoint ?? "n/a"}</div>
          </div>
        )}

        {!codeSent ? (
          <>
            <div className="mb-4">
              <label htmlFor="phone" className="block text-sm mb-1">Phone number</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                className="w-full border px-3 py-2 rounded"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 555-5555"
                required
                disabled={sending}
              />
            </div>

            <button
              type="submit"
              disabled={sending || !phone.trim()}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {sending ? "Sending..." : "Send code"}
            </button>
          </>
        ) : null}

        {codeSent ? (
          <div className="mt-6">
            <button
              type="button"
              onClick={() => {
                void handleResendCode();
              }}
              disabled={sending || verifying}
              className="mb-3 text-sm text-blue-600 underline disabled:opacity-50"
            >
              Resend code
            </button>
            <label htmlFor="otp-digit-1" className="block text-sm mb-1">OTP digit 1</label>
            <input
              id="otp-digit-1"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              className="w-full border px-3 py-2 rounded"
              value={code}
              onChange={(event) => {
                const next = event.target.value.replace(/\D/g, "").slice(0, 6);
                setCode(next);
              }}
              aria-label="OTP digit 1"
              disabled={verifying}
            />
            <button
              type="button"
              className="mt-3 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              onClick={() => {
                void handleVerify();
              }}
              disabled={verifying || code.length !== 6}
            >
              {verifying ? "Verifying..." : "Verify"}
            </button>
          </div>
        ) : null}
      </form>
    </div>
  );
}
