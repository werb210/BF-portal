import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api";

type Profile = {
  name?: string; phone?: string; website?: string; description?: string;
  contact_name?: string; contact_email?: string; contact_phone?: string;
  street?: string; city?: string; region?: string; postal_code?: string;
};

function authHeader() {
  return { Authorization: `Bearer ${sessionStorage.getItem("lender_token")}` };
}

const FIELDS: { key: keyof Profile; label: string; type?: string }[] = [
  { key: "name", label: "Company name" },
  { key: "website", label: "Website" },
  { key: "phone", label: "Main phone", type: "tel" },
  { key: "contact_name", label: "Contact name" },
  { key: "contact_email", label: "Contact email", type: "email" },
  { key: "contact_phone", label: "Contact phone", type: "tel" },
  { key: "street", label: "Street" },
  { key: "city", label: "City" },
  { key: "region", label: "Province / State" },
  { key: "postal_code", label: "Postal / ZIP" },
  { key: "description", label: "Description" },
];

export default function LenderProfilePage() {
  const [form, setForm] = useState<Profile>({});
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    void (async () => {
      try {
        const data = await api<Profile>("/api/lender/me", { headers: authHeader() });
        setForm(data ?? {});
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to load profile");
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  async function save() {
    setSaving(true); setErr(null); setMsg(null);
    try {
      await api("/api/lender/me", { method: "PATCH", body: JSON.stringify(form), headers: authHeader() });
      setMsg("Saved.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page space-y-4 max-w-2xl mx-auto p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Lender Profile</h1>
        <button className="ui-button" onClick={() => navigate("/lender-portal/products")}>My Products</button>
      </div>
      {!loaded && <div className="text-sm text-slate-500">Loading…</div>}
      {loaded && (
        <section className="drawer-section space-y-3">
          {FIELDS.map((f) => (
            <div key={f.key}>
              <label className="block text-sm text-slate-600 mb-1">{f.label}</label>
              <input className="w-full border rounded p-2" type={f.type ?? "text"}
                value={form[f.key] ?? ""}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
            </div>
          ))}
          {err && <p className="text-sm text-red-600">{err}</p>}
          {msg && <p className="text-sm text-green-600">{msg}</p>}
          <button className="ui-button ui-button--primary" disabled={saving} onClick={save}>
            {saving ? "Saving…" : "Save profile"}
          </button>
        </section>
      )}
    </div>
  );
}
