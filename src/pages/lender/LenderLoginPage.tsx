import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api";

export default function LenderLoginPage() {
  const [step, setStep] = useState<"enter" | "verify">("enter");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const navigate = useNavigate();

  async function sendCode() {
    if (!name || !email || !phone) {
      setErr("Name, email, and phone required.");
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      await api("/api/v1/otp/request", {
        method: "POST",
        body: JSON.stringify({ name, email, phone, userType: "lender" })
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
      }>("/api/v1/otp/verify", {
        method: "POST",
        body: JSON.stringify({ phone, code })
      });
      sessionStorage.setItem("lender_token", r.token);
      sessionStorage.setItem("lender_user", JSON.stringify(r.user));
      navigate(r.profileComplete === false ? "/lender-portal/profile" : "/lender-portal/deals");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Invalid code");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded border bg-white p-4 space-y-3">
        <h1 className="text-xl font-semibold">Lender Portal</h1>
        {step === "enter" && (
          <>
            <input className="w-full border rounded p-2" placeholder="Full Name"
              value={name} onChange={(e) => setName(e.target.value)} />
            <input className="w-full border rounded p-2" type="email" placeholder="Email"
              value={email} onChange={(e) => setEmail(e.target.value)} />
            <input className="w-full border rounded p-2" type="tel" placeholder="+1XXXXXXXXXX"
              value={phone} onChange={(e) => setPhone(e.target.value)} />
            {err && <p className="text-sm text-red-600">{err}</p>}
            <button className="ui-button ui-button--primary w-full"
              disabled={loading || !name || !email || !phone} onClick={sendCode}>
              Send code
            </button>
          </>
        )}
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
