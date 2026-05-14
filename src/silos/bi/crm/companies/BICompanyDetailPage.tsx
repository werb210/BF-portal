// BF_PORTAL_BLOCK_v211_BI_COMPANY_DETAIL_v1
// BI-side mirror of src/pages/crm/companies/CompanyDetailPage.tsx.
// Three-column layout, same light-theme HubSpot palette as the rest of
// BI CRM (matches BIContactDetailPage v207/v208). Backed by v256
// GET /api/v1/bi/crm/companies/:id which returns company + contacts +
// applications in one response.
//
// Edit is inline-replace (v208 pattern), not a modal. Delete is not
// shipped yet — pairs with BI-Server v258 when the destructive flow is
// ready. Activity timeline at the company scope is not part of this
// block; bi_contact_activity is per-contact, and a future
// bi_company_activity table can be added if the workflow asks for it.

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "@/api";

type BICompany = {
  id: string;
  legal_name: string;
  operating_name: string | null;
  business_number: string | null;
  address_line1: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  industry: string | null;
  created_at: string;
  contact_count: number;
  application_count: number;
};

type LinkedContact = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone_e164: string | null;
  title: string | null;
  outreach_status: string | null;
  created_at: string;
};

type LinkedApplication = {
  id: string;
  application_code: string | null;
  stage: string | null;
  status: string | null;
  created_at: string;
};

type DetailResponse = {
  company: BICompany;
  contacts: LinkedContact[];
  applications: LinkedApplication[];
};

export default function BICompanyDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  // BF_PORTAL_BLOCK_v280_COMPANIES_DELETE_BUTTON_v1
  async function deleteCompany() {
    if (!co?.id) return;
    if (!confirm(`Delete ${co.legal_name}? This removes the company record. Linked applications and contacts stay but lose the company link.`)) return;
    setActionError(null);
    try {
      await api(`/api/v1/bi/crm/companies/${co.id}`, { method: "DELETE" });
      navigate("/silo/bi/crm");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Delete failed");
    }
  }
  const [form, setForm] = useState<{
    legal_name: string;
    operating_name: string;
    industry: string;
    business_number: string;
    address_line1: string;
    city: string;
    province: string;
    postal_code: string;
  }>({
    legal_name: "",
    operating_name: "",
    industry: "",
    business_number: "",
    address_line1: "",
    city: "",
    province: "",
    postal_code: "",
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    (async () => {
      try {
        const r: any = await api(`/api/v1/bi/crm/companies/${id}`);
        if (cancelled) return;
        const payload: DetailResponse | null = r?.data ?? r ?? null;
        setData(payload);
        const co = payload?.company;
        if (co) {
          setForm({
            legal_name: co.legal_name ?? "",
            operating_name: co.operating_name ?? "",
            industry: co.industry ?? "",
            business_number: co.business_number ?? "",
            address_line1: co.address_line1 ?? "",
            city: co.city ?? "",
            province: co.province ?? "",
            postal_code: co.postal_code ?? "",
          });
        }
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? "Could not load company.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, refreshKey]);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  async function saveEdit() {
    if (!data?.company) return;
    const co = data.company;
    setSaving(true);
    setActionError(null);
    // Diff: only send fields the user changed. null clears, undefined leaves alone.
    const patch: Record<string, unknown> = {};
    const pairs: Array<[keyof typeof form, string | null]> = [
      ["legal_name", co.legal_name],
      ["operating_name", co.operating_name],
      ["industry", co.industry],
      ["business_number", co.business_number],
      ["address_line1", co.address_line1],
      ["city", co.city],
      ["province", co.province],
      ["postal_code", co.postal_code],
    ];
    for (const [key, current] of pairs) {
      const next = form[key];
      if (next !== (current ?? "")) {
        patch[key as string] = next || null;
      }
    }
    if (Object.keys(patch).length === 0) {
      setEditing(false);
      setSaving(false);
      return;
    }
    try {
      await api(`/api/v1/bi/crm/companies/${id}`, {
        method: "PATCH",
        body: patch,
      } as any);
      setEditing(false);
      refresh();
    } catch (e: any) {
      setActionError(e?.message ?? "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  if (err)
    return (
      <div style={{ padding: 24, color: "#b00020", background: "#fff", borderRadius: 8 }}>
        {err}
      </div>
    );
  if (loading || !data?.company)
    return (
      <div style={{ padding: 24, background: "#fff", borderRadius: 8 }}>Loading…</div>
    );

  const co = data.company;
  const location = [co.city, co.province].filter(Boolean).join(", ");

  return (
    <div style={layout} data-testid="bi-company-detail">
      {/* LEFT RAIL — identity + actions + fields */}
      <aside style={rail} data-testid="bi-company-rail-left">
        <Link to="/silo/bi/crm" style={backLink}>
          ← Back to companies
        </Link>

        <h2 style={{ marginTop: 0, marginBottom: 4 }}>{co.legal_name}</h2>
        {co.operating_name && co.operating_name !== co.legal_name && (
          <div style={subtle}>o/a {co.operating_name}</div>
        )}

        {!editing && (
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setEditing(true)}
              style={actionBtn}
              data-testid="bi-company-edit-button"
            >
              Edit
            </button>
            {/* BF_PORTAL_BLOCK_v280_COMPANIES_DELETE_BUTTON_v1 */}
            <button
              type="button"
              onClick={() => void deleteCompany()}
              style={{ ...actionBtn, background: "#b00020", color: "white" }}
              data-testid="bi-company-delete-button"
            >
              Delete
            </button>
          </div>
        )}

        {actionError && (
          <div style={{ marginTop: 8, color: "#b00020", fontSize: 12 }} role="status">
            {actionError}
          </div>
        )}

        {editing ? (
          <div style={fieldsBlock} data-testid="bi-company-edit-form">
            <FieldEdit
              label="Legal name"
              value={form.legal_name}
              onChange={(v) => setForm({ ...form, legal_name: v })}
            />
            <FieldEdit
              label="Operating name"
              value={form.operating_name}
              onChange={(v) => setForm({ ...form, operating_name: v })}
            />
            <FieldEdit
              label="Industry"
              value={form.industry}
              onChange={(v) => setForm({ ...form, industry: v })}
            />
            <FieldEdit
              label="Business number"
              value={form.business_number}
              onChange={(v) => setForm({ ...form, business_number: v })}
            />
            <FieldEdit
              label="Address"
              value={form.address_line1}
              onChange={(v) => setForm({ ...form, address_line1: v })}
            />
            <FieldEdit
              label="City"
              value={form.city}
              onChange={(v) => setForm({ ...form, city: v })}
            />
            <FieldEdit
              label="Province"
              value={form.province}
              onChange={(v) => setForm({ ...form, province: v })}
            />
            <FieldEdit
              label="Postal code"
              value={form.postal_code}
              onChange={(v) => setForm({ ...form, postal_code: v })}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => void saveEdit()}
                disabled={saving || !form.legal_name.trim()}
                style={{
                  ...actionBtn,
                  background: "#0d9b6c",
                  color: "#fff",
                  borderColor: "#0d9b6c",
                }}
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setActionError(null);
                  setForm({
                    legal_name: co.legal_name ?? "",
                    operating_name: co.operating_name ?? "",
                    industry: co.industry ?? "",
                    business_number: co.business_number ?? "",
                    address_line1: co.address_line1 ?? "",
                    city: co.city ?? "",
                    province: co.province ?? "",
                    postal_code: co.postal_code ?? "",
                  });
                }}
                disabled={saving}
                style={actionBtn}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div style={fieldsBlock}>
            <Field label="Industry" value={co.industry} />
            <Field label="Business number" value={co.business_number} />
            <Field label="Address" value={co.address_line1} />
            <Field label="Location" value={location || null} />
            <Field label="Postal code" value={co.postal_code} />
            <Field
              label="Created"
              value={new Date(co.created_at).toLocaleString()}
            />
          </div>
        )}
      </aside>

      {/* MAIN — applications */}
      <main style={mainCol} data-testid="bi-company-main">
        <div style={panel}>
          <div style={panelHeader}>
            <h3 style={{ margin: 0 }}>Applications</h3>
            <span style={badge}>{co.application_count}</span>
          </div>
          {data.applications.length === 0 ? (
            <p style={{ color: "#7c98b6", padding: 12 }}>
              No applications linked to this company.
            </p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {data.applications.map((a) => (
                <li
                  key={a.id}
                  style={appRow}
                  data-testid="bi-company-application-row"
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <Link
                      to={`/silo/bi/pipeline/${a.id}`}
                      style={{ color: "#0091ae", fontWeight: 600 }}
                    >
                      {a.application_code || a.id.slice(0, 8)}
                    </Link>
                    <span style={{ color: "#516f90", fontSize: 12 }}>
                      {new Date(a.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div style={{ marginTop: 4, color: "#33475b", fontSize: 13 }}>
                    {a.stage ? a.stage.replace(/_/g, " ") : "—"}
                    {a.status && (
                      <span style={{ marginLeft: 8, color: "#7c98b6" }}>
                        · {a.status}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      {/* RIGHT RAIL — contacts roster */}
      <aside style={rail} data-testid="bi-company-rail-right">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h3 style={{ margin: 0 }}>Contacts</h3>
          <span style={badge}>{co.contact_count}</span>
        </div>
        {data.contacts.length === 0 ? (
          <div style={{ ...subtle, marginTop: 12 }}>No contacts at this company.</div>
        ) : (
          <div style={{ marginTop: 12 }}>
            {data.contacts.map((c) => (
              <div
                key={c.id}
                style={contactRow}
                data-testid="bi-company-contact-row"
              >
                <Link
                  to={`/silo/bi/crm/contacts/${c.id}`}
                  style={{ color: "#0091ae", fontWeight: 600 }}
                >
                  {c.full_name || "(no name)"}
                </Link>
                {c.title && (
                  <div style={{ fontSize: 12, color: "#516f90" }}>{c.title}</div>
                )}
                {c.email && (
                  <div style={{ fontSize: 12, color: "#334155" }}>{c.email}</div>
                )}
                {c.phone_e164 && (
                  <div style={{ fontSize: 12, color: "#334155" }}>{c.phone_e164}</div>
                )}
                {c.outreach_status && (
                  <div style={{ fontSize: 11, color: "#7c98b6", marginTop: 2 }}>
                    {c.outreach_status.replace(/_/g, " ")}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={fieldLabel}>{label}</div>
      <div style={{ color: "#000" }}>{value || "—"}</div>
    </div>
  );
}

function FieldEdit(props: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={fieldLabel}>{props.label}</div>
      <input
        type="text"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        style={{
          width: "100%",
          marginTop: 4,
          padding: 8,
          border: "1px solid #cbd6e2",
          borderRadius: 4,
          background: "#fff",
          color: "#000",
          fontSize: 13,
        }}
        aria-label={props.label}
      />
    </div>
  );
}

const layout: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "320px 1fr 320px",
  gap: 16,
  padding: 16,
  background: "#fff",
  color: "#000",
  borderRadius: 8,
};
const rail: CSSProperties = {
  background: "#fff",
  border: "1px solid #eaf0f6",
  borderRadius: 6,
  padding: 16,
};
const mainCol: CSSProperties = { minWidth: 0 };
const panel: CSSProperties = {
  background: "#fff",
  border: "1px solid #eaf0f6",
  borderRadius: 6,
  padding: 0,
};
const panelHeader: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "12px 16px",
  borderBottom: "1px solid #eaf0f6",
  background: "#f5f8fa",
};
const badge: CSSProperties = {
  background: "#e5e7eb",
  color: "#111827",
  padding: "2px 8px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 600,
};
const backLink: CSSProperties = {
  color: "#1d4ed8",
  fontSize: 14,
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  marginBottom: 12,
};
const subtle: CSSProperties = {
  color: "#516f90",
  fontSize: 13,
  marginBottom: 12,
};
const fieldsBlock: CSSProperties = {
  marginTop: 16,
  paddingTop: 16,
  borderTop: "1px solid #eaf0f6",
};
const fieldLabel: CSSProperties = {
  fontSize: 11,
  color: "#7c98b6",
  textTransform: "uppercase",
};
const actionBtn: CSSProperties = {
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#0f172a",
  borderRadius: 6,
  padding: "6px 12px",
  fontSize: 13,
  cursor: "pointer",
};
const appRow: CSSProperties = {
  padding: "12px 16px",
  borderBottom: "1px solid #eaf0f6",
};
const contactRow: CSSProperties = {
  padding: "8px 0",
  borderBottom: "1px solid #eef2f7",
};
