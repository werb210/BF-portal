import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api";

export default function ReferrerLoginPage() {
  const [step, setStep] = useState<"enter" | "verify">("enter");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const navigate = useNavigate();

  async function sendCode() {
    if (!phone) {
      setErr("Phone number required.");
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      await api("/api/auth/otp/start", {
        method: "POST",
        body: JSON.stringify({ phone, userType: "referrer" })
      });
      setStep("verify");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to send code");
    } finally {
      setLoading(false);
    }
  }

  async function verify() {
    setLoading(true);
    setErr(null);
    try {
      const r = await api<{
        token: string;
        user: { id: string; name: string | null; email: string | null; phone: string; userType: string };
        profileComplete?: boolean;
      }>("/api/auth/otp/verify", {
        method: "POST",
        body: JSON.stringify({ phone, code, userType: "referrer" }) // REFERRER_BF_WIRING_v1
      });
      sessionStorage.setItem("referrer_token", r.token);
      sessionStorage.setItem("referrer_user", JSON.stringify(r.user));
      navigate(r.profileComplete === false ? "/referrer/profile" : "/referrer");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Invalid code");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded border bg-white p-4 space-y-3">
        {/* REFERRER_LOGIN_SIGNUP_LINK_v1 - explicit color (was theme-less -> invisible on
            the un-themed referrer pages) + a subtitle. */}
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "#1F3B63" }}>Referral Partner Login</h1>
          <p className="text-sm text-gray-600">Sign in with the mobile number on your referral agreement.</p>
        </div>
        {step === "enter" && (
          <>
            <input className="w-full border rounded p-2" type="tel" placeholder="+1XXXXXXXXXX"
              value={phone} onChange={(e) => setPhone(e.target.value)} />
            {err && <p className="text-sm text-red-600">{err}</p>}
            <button className="ui-button ui-button--primary w-full"
              disabled={loading || !phone} onClick={sendCode}>
              Send code
            </button>
          </>
        )}
        {/* REFERRER_LOGIN_SIGNUP_LINK_v1 - first-timers who land on /referrer/login
            (e.g. an old bookmark) need a path to signup; they cannot log in until
            their agreement is signed. */}
        <p className="text-center text-sm text-gray-500 pt-1">
          New referral partner?{" "}
          <button type="button" className="underline" onClick={() => navigate("/referrer/signup")}>
            Sign up
          </button>
        </p>
        {step === "verify" && (
          <>
            <p className="text-sm text-gray-600">Enter the 6-digit code sent to {phone}.</p>
            <input className="w-full border rounded p-2 text-center tracking-widest"
              maxLength={6} inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
            {err && <p className="text-sm text-red-600">{err}</p>}
            <button className="ui-button ui-button--primary w-full"
              disabled={loading || code.length !== 6} onClick={verify}>
              Verify
            </button>
            <button type="button" className="text-sm text-gray-500 underline"
              onClick={() => setStep("enter")}>
              Change details
            </button>
          </>
        )}
      </div>
    </div>
  );
}
