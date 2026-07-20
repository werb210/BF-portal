// REFERRER_SIGNUP_UI_v1 - public referrer self-signup + on-page SignNow
// agreement. A first-time referrer fills name/email/phone/address (used to
// pre-fill the agreement) + e-transfer email (20% commission payout). On
// submit, BF-Server creates their pending record and returns an embedded
// SignNow signing URL, which renders in an iframe right here. When they finish
// signing, we verify with the server (/signup/complete), store the referrer
// token, and drop them into the portal. Until the agreement is signed they
// cannot OTP-log-in, so signup is the first thing they see.
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api";
import logoUrl from "@/assets/logo-boreal-mountains-white.svg"; // BF_PORTAL_REFERRER_BRAND_v1

type SignupResp = {
  referrerId: string;
  agreementConfigured: boolean;
  signingUrl?: string;
  groupId?: string;
  alreadyActive?: boolean;
};

const EMPTY = {
  full_name: "",
  email: "",
  phone: "",
  street: "",
  city: "",
  province: "",
  postal_code: "",
  company_name: "",
  etransfer_email: "",
};

export default function ReferrerSignupPage() {
  const [form, setForm] = useState({ ...EMPTY });
  const [stage, setStage] = useState<"form" | "sign">("form");
  const [signingUrl, setSigningUrl] = useState<string | null>(null);
  const [referrerId, setReferrerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);
  const navigate = useNavigate();

  const set = (k: keyof typeof EMPTY, v: string) => setForm((s) => ({ ...s, [k]: v }));
  const required = form.full_name && form.email && form.phone && form.street && form.city && form.province && form.postal_code;

  async function submit() {
    if (!required) {
      setErr("Please fill in your name, email, phone and full address.");
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const res = await api<SignupResp>("/api/referrer/signup", {
        method: "POST",
        body: JSON.stringify(form),
      });
      if (res.alreadyActive) {
        setNotice("You already have an account. Please log in.");
        navigate("/referrer/login");
        return;
      }
      setReferrerId(res.referrerId);
      if (res.agreementConfigured && res.signingUrl) {
        setSigningUrl(res.signingUrl);
        setStage("sign");
      } else {
        // Template not wired on the server yet - record the signup and tell the
        // person we'll follow up. (Staff will finish the SignNow template.)
        setNotice("Thanks! Your details are saved. We'll email you the referral agreement to sign shortly.");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // While the signing iframe is open, poll the server to detect completion.
  // The SignNow webhook also activates them independently; whichever wins, the
  // /signup/complete call is idempotent and returns the referrer token.
  useEffect(() => {
    if (stage !== "sign" || !referrerId) return;
    let cancelled = false;
    async function checkOnce() {
      try {
        const res = await api<{ token: string; user: { id: string; name: string | null } }>(
          "/api/referrer/signup/complete",
          { method: "POST", body: JSON.stringify({ referrerId }) },
        );
        if (cancelled) return;
        if (res?.token) {
          sessionStorage.setItem("referrer_token", res.token);
          sessionStorage.setItem("referrer_user", JSON.stringify({ ...res.user, userType: "referrer" }));
          if (pollRef.current) window.clearInterval(pollRef.current);
          navigate("/referrer");
        }
      } catch {
        // 409 agreement_not_signed is expected until they finish; keep polling.
      }
    }
    pollRef.current = window.setInterval(checkOnce, 4000);
    return () => {
      cancelled = true;
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [stage, referrerId, navigate]);

  if (stage === "sign" && signingUrl) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="border-b bg-white p-3 text-center">
          <h1 className="text-lg font-semibold">Sign your Referral Agreement</h1>
          <p className="text-sm text-gray-600">
            Complete and sign below. As soon as it's signed you'll be taken to your referral dashboard.
          </p>
          {err && <p className="text-sm text-red-600">{err}</p>}
        </div>
        <iframe
          title="Referral Agreement"
          src={signingUrl}
          className="flex-1 w-full border-0"
          allow="fullscreen"
        />
      </div>
    );
  }

  // BF_PORTAL_REFERRER_BRAND_v1 - same external-portal shell as the lender portal.
  return (
    <div data-testid="referrer-signup-screen" style={{ colorScheme: "light" }} className="min-h-screen w-screen flex items-center justify-center bg-[#020817] px-4 py-12"> {/* BF_PORTAL_REFERRER_SIGNUP_LIGHT_v1 */}
      <div className="w-full max-w-lg flex flex-col items-center gap-6">
        <div className="text-center">
          <img src={logoUrl} alt="Boreal" style={{ display: "block", margin: "0 auto 18px", height: 88, width: "auto" }} />
          <h1 className="text-2xl font-semibold text-white">Boreal Financial Group</h1>
          <p className="mt-1 text-sm font-medium text-white/70">Referral Portal</p>
        </div>
      <div className="w-full bg-white border border-slate-200 rounded-xl p-6 shadow-md space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Become a Boreal Referral Partner</h2>
          <p className="text-sm text-slate-600">
            Sign up and sign our referral agreement to start referring clients and earning commission.
          </p>
        </div>

        {notice && <p className="text-sm text-green-700">{notice}</p>}

        <div className="grid grid-cols-1 gap-3">
          <input className="w-full border rounded p-2 bg-white text-slate-900" placeholder="Full name *"
            value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <input className="w-full border rounded p-2 bg-white text-slate-900" type="email" placeholder="Email *"
              value={form.email} onChange={(e) => set("email", e.target.value)} />
            <input className="w-full border rounded p-2 bg-white text-slate-900" type="tel" placeholder="Mobile phone *"
              value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
          <input className="w-full border rounded p-2 bg-white text-slate-900" placeholder="Company name (optional)"
            value={form.company_name} onChange={(e) => set("company_name", e.target.value)} />
          <input className="w-full border rounded p-2 bg-white text-slate-900" placeholder="Street address *"
            value={form.street} onChange={(e) => set("street", e.target.value)} />
          <div className="grid grid-cols-3 gap-3">
            <input className="w-full border rounded p-2 bg-white text-slate-900" placeholder="City *"
              value={form.city} onChange={(e) => set("city", e.target.value)} />
            <input className="w-full border rounded p-2 bg-white text-slate-900" placeholder="Province / State *"
              value={form.province} onChange={(e) => set("province", e.target.value)} />
            <input className="w-full border rounded p-2 bg-white text-slate-900" placeholder="Postal / ZIP *"
              value={form.postal_code} onChange={(e) => set("postal_code", e.target.value)} />
          </div>
          <input className="w-full border rounded p-2 bg-white text-slate-900" type="email"
            placeholder="e-Transfer email for commission payouts (optional)"
            value={form.etransfer_email} onChange={(e) => set("etransfer_email", e.target.value)} />
        </div>

        {err && <p className="text-sm text-red-600">{err}</p>}

        <button className="w-full py-3.5 px-5 text-[17px] font-bold text-slate-900 bg-amber-500 hover:bg-amber-600 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed"
          disabled={loading || !required} onClick={submit}>
          {loading ? "Starting…" : "Sign up & review agreement"}
        </button>

        <p className="text-center text-sm text-slate-500">
          Already a referral partner?{" "}
          <button type="button" className="underline text-blue-700 font-medium" onClick={() => navigate("/referrer/login")}>
            Log in
          </button>
        </p>
      </div>
        <p className="text-xs text-white/50 text-center">
          Boreal Financial Group &middot; 450 Sparling Crt SW, Edmonton, AB T6X 1G9
        </p>
      </div>
    </div>
  );
}
