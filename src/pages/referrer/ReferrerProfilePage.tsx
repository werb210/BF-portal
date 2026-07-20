// BF_PORTAL_REFERRER_PROFILE_EDIT_v1 - editable referrer info, pre-filled from /me.
// BF_PORTAL_REFERRER_PROFILE_PARITY_v1 - the edit form is now a 1:1 mirror of the
// signup form (all 9 fields, including address + the e-Transfer payout email, which
// a referrer previously had no way to correct). Also fixes the prefill: /me returns
// { status, profile: {...} } and api() only unwraps a `data` envelope, so the old
// code read me.first_name (always undefined) and the form never populated.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api";

function authHeader() {
  return { Authorization: `Bearer ${sessionStorage.getItem("referrer_token")}` };
}

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

type MeResponse = {
  profile?: {
    full_name?: string | null;
    company_name?: string | null;
    email?: string | null;
    phone?: string | null;
    street?: string | null;
    city?: string | null;
    province?: string | null;
    postal_code?: string | null;
    etransfer_email?: string | null;
  };
};

export default function ReferrerProfilePage() {
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    api<MeResponse>("/api/referrer/me", { headers: authHeader() })
      .then((me) => {
        if (cancelled || !me) return;
        const p = me.profile;
        if (!p) return;
        setForm({
          full_name: p.full_name ?? "",
          email: p.email ?? "",
          phone: p.phone ?? "",
          street: p.street ?? "",
          city: p.city ?? "",
          province: p.province ?? "",
          postal_code: p.postal_code ?? "",
          company_name: p.company_name ?? "",
          etransfer_email: p.etransfer_email ?? "",
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const valid = Boolean(
    form.full_name && form.email && form.phone && form.street && form.city && form.province && form.postal_code,
  );

  function set(key: keyof typeof EMPTY) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value });
  }

  async function save() {
    setSaving(true);
    setErr(null);
    setSaved(false);
    try {
      await api("/api/referrer/profile", {
        method: "POST",
        body: JSON.stringify(form),
        headers: authHeader(),
      });
      setSaved(true);
      window.setTimeout(() => navigate("/referrer"), 700);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't save your info.");
    } finally {
      setSaving(false);
    }
  }

  const input = "w-full border rounded p-2";
  const label = "block text-sm font-medium text-slate-700 mb-1"; // BF_PORTAL_REFERRER_PROFILE_LABELS_v1

  return (
    <div className="flex justify-center p-4">
      <div className="w-full max-w-md rounded border bg-white p-4 space-y-3">
        <h1 className="text-xl font-semibold">Your info</h1>
        <p className="text-sm text-slate-500">
          Update your details. This is where we send referral updates and issue your referral fees.
        </p>

        {/* BF_PORTAL_REFERRER_PROFILE_LABELS_v1 - fields showed only placeholders, which vanish
            once filled; add a visible label above each. */}
        <div>
          <label className={label}>Full name *</label>
          <input className={input} placeholder="Full name" value={form.full_name} onChange={set("full_name")} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={label}>Email *</label>
            <input className={input} type="email" placeholder="Email" value={form.email} onChange={set("email")} />
          </div>
          <div>
            <label className={label}>Mobile phone *</label>
            <input className={input} type="tel" placeholder="Mobile phone" value={form.phone} onChange={set("phone")} />
          </div>
        </div>
        <div>
          <label className={label}>Company name (optional)</label>
          <input className={input} placeholder="Company name" value={form.company_name} onChange={set("company_name")} />
        </div>
        <div>
          <label className={label}>Street address *</label>
          <input className={input} placeholder="Street address" value={form.street} onChange={set("street")} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className={label}>City *</label>
            <input className={input} placeholder="City" value={form.city} onChange={set("city")} />
          </div>
          <div>
            <label className={label}>Province / State *</label>
            <input className={input} placeholder="Province / State" value={form.province} onChange={set("province")} />
          </div>
          <div>
            <label className={label}>Postal / ZIP *</label>
            <input className={input} placeholder="Postal / ZIP" value={form.postal_code} onChange={set("postal_code")} />
          </div>
        </div>
        <div>
          <label className={label}>e-Transfer email for commission payouts (optional)</label>
          <input className={input} type="email" placeholder="e-Transfer email" value={form.etransfer_email} onChange={set("etransfer_email")} />
        </div>

        {err ? <p className="text-sm text-red-600">{err}</p> : null}
        {saved ? <p className="text-sm text-green-700">Saved.</p> : null}

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            className="rounded p-2"
            style={{ background: "#ffffff", color: "#1e2a5a", border: "1px solid #cbd5e1" }}
            onClick={() => navigate("/referrer")}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className="rounded p-2 text-white disabled:opacity-60"
            style={{ background: "#1e2a5a" }}
            onClick={save}
            disabled={!valid || saving}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
