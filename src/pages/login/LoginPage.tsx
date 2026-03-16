import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "@/api/http";
import { useAuth } from "@/hooks/useAuth";

function normalizePhone(input: string) {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}

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
  const { authenticated, authStatus, verifyOtp } = useAuth();
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
      const details = err.details as { message?: string; error?: string } | undefined;
      const inlineMessage =
        err.status === 400
          ? details?.message ?? details?.error ?? err.message ?? fallback
          : err.message ?? fallback;
      setError(preferFallback ? fallback : inlineMessage);
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

  const sendCode = async (phoneValue = phone) => {
    try {
      setError(null);
      setRequestId(null);
      setEndpoint("/api/auth/otp/start");
      setStatusMessage(null);
      setSending(true);

      const payload = {
        phone: normalizePhone(phoneValue),
      };

      const response = await fetch("/api/auth/otp/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: { message?: string };
          message?: string;
        } | null;
        throw {
          message: body?.error?.message ?? body?.message ?? "Failed to send verification code",
          response: {
            headers: {
              "x-request-id": response.headers.get("x-request-id") ?? "n/a",
            },
            data: body,
          },
        };
      }

      setNormalizedPhone(payload.phone);
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
    setEndpoint("/api/auth/otp/verify");

    try {
      const verified = await verifyOtp({ phone: normalizedPhone, code });
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
