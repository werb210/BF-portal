import { useState } from "react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "@/api/http";
import { useAuth } from "@/hooks/useAuth";

const normalizePhone = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("1") && digits.length === 11) return `+${digits}`;
  if (value.trim().startsWith("+")) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return `+${digits}`;
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

  useEffect(() => {
    if (authenticated && authStatus === "authenticated") {
      navigate("/dashboard", { replace: true });
    }
  }, [authenticated, authStatus, navigate]);

  const readApiError = (err: unknown, fallback: string, preferFallback = false) => {
    if (err instanceof ApiError) {
      setError(preferFallback ? fallback : (err.message || fallback));
      setRequestId(err.requestId ?? "n/a");
      return;
    }

    const axiosLike = err as { message?: string; code?: string };
    if (axiosLike?.code === "ERR_NETWORK") {
      setError("Network error. Please check your connection and retry.");
      setRequestId("n/a");
      return;
    }

    setError(axiosLike?.message ?? fallback);
    setRequestId("n/a");
  };

  const requestOtpCode = async (phoneValue: string) => {
    setError(null);
    setRequestId(null);
    setEndpoint("/auth/otp/start");
    setStatusMessage(null);
    setSending(true);

    try {
      await startOtp({ phone: phoneValue });
      setNormalizedPhone(phoneValue);
      setCodeSent(true);
      setStatusMessage("Code sent. Check your phone for the verification code.");
    } catch (err) {
      console.error("OTP start failed.", err);
      readApiError(err, "Unable to send verification code.");
    } finally {
      setSending(false);
    }
  };

  const handleSendCode = async () => {
    const parsedPhone = normalizePhone(phone);
    if (!parsedPhone) return;

    await requestOtpCode(parsedPhone);
  };


  const handleResendCode = async () => {
    if (!normalizedPhone) return;
    await requestOtpCode(normalizedPhone);
  };

  const attemptVerify = async (nextCode: string) => {
    if (nextCode.length !== 6 || !normalizedPhone) {
      return;
    }

    setVerifying(true);
    setError(null);
    setRequestId(null);
    setEndpoint("/auth/otp/verify");

    try {
      const verified = await verifyOtp({ phone: normalizedPhone, code: nextCode });
      if (!verified) {
        throw new Error("Verification failed");
      }
    } catch (err) {
      setStatusMessage(null);
      const message = err instanceof Error ? err.message : "";
      if (/failed/i.test(message)) {
        readApiError(err, "Verification failed", false);
      } else {
        readApiError(err, "Invalid verification code", true);
      }
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleSendCode();
        }}
        className="bg-white p-8 rounded shadow-md w-96"
      >
        <h1 className="text-xl font-semibold mb-6 text-center">Staff Login</h1>

        {statusMessage ? <div role="status" className="mb-4 text-sm text-green-700">{statusMessage}</div> : null}

        {error ? (
          <div role="alert" className="mb-4 text-sm text-red-600">
            <div>{error}</div>
            <div>Request ID: {requestId ?? "n/a"}</div>
            <div>Endpoint: {endpoint ?? "n/a"}</div>
          </div>
        ) : null}

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
                onChange={(event) => setPhone(event.target.value)}
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
                void attemptVerify(next);
              }}
              aria-label="OTP digit 1"
              disabled={verifying}
            />
          </div>
        ) : null}
      </form>
    </div>
  );
}
