// BF_PORTAL_BLOCK_v211_BI_COMPANY_DETAIL_v1
// BI-side mirror of src/pages/crm/companies/CompanyDetailPage.tsx.
// Three-column layout, same light-theme HubSpot palette as the rest of
// BI CRM (matches BIContactDetailPage v207/v208). Backed by v256
// GET /api/v1/bi/crm/companies/:id which returns company + contacts +
// applications in one response.
//
// Edit is inline-replace (v208 pattern), not a modal. Delete is not
// shipped yet — pairs with BI-Server v258 when the destructive flow is
// ready. BF_PORTAL_v789_BI_COMPANY_ACTIVITY - company-scope activity now
// exists on BI-Server v789 and is shown and written from this page.

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { BI_CRM_BACKEND } from "@/components/crm/unified/crmUnifiedApi"; // BF_PORTAL_v856_CRM_UNIFY
import { useTagCatalogue } from "@/components/crm/unified/CrmTags"; // BF_PORTAL_v856_CRM_UNIFY
import { CrmDuplicatesBanner } from "@/components/crm/unified/CrmDuplicates"; // BF_PORTAL_v856_CRM_UNIFY
import { CrmAiSummary } from "@/components/crm/unified/CrmAiSummary"; // BF_PORTAL_v856_CRM_UNIFY
import { CrmCompanyDetails, CrmCompanyPeople, CrmCompanyTagEditor } from "@/components/crm/unified/CrmCompany"; // BF_PORTAL_v856_CRM_UNIFY
import { api } from "@/api";
import { ActionBar } from "@/components/crm/ActionBar";
import { BICompanyActivity } from "./BICompanyActivity";

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
  const { catalogue: tagCatalogue } = useTagCatalogue(BI_CRM_BACKEND); // BF_PORTAL_v856_CRM_UNIFY

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
      <div style={{ padding: 24, color: "var(--ui-text-danger)", background: "var(--ui-surface-strong)", borderRadius: 8 }}>
        {err}
      </div>
    );
  if (loading || !data?.company)
    return (
      <div style={{ padding: 24, background: "var(--ui-surface-strong)", borderRadius: 8 }}>Loading…</div>
    );

  const co = data.company;
  const location = [co.city, co.province].filter(Boolean).join(", ");

  return (
    <div className="crm-detail-layout" data-testid="bi-company-detail">
      {/* LEFT RAIL — identity + actions + fields */}
      <aside style={rail} data-testid="bi-company-rail-left">
        <Link to="/silo/bi/crm?tab=companies" style={backLink}>
          ← Back to companies
        </Link>

        <h2 style={{ marginTop: 0, marginBottom: 4 }}>{co.legal_name}</h2>
        {co.operating_name && co.operating_name !== co.legal_name && (
          <div style={subtle}>o/a {co.operating_name}</div>
        )}

        {/* BF_PORTAL_v789_BI_COMPANY_ACTIVITY - the shared ActionBar on BI-Server: Note, Call, Meeting
            and Email log to /api/v1/bi/crm/companies/:id/activity. Edit/Delete/Google stay here. */}
        {!editing && (
          <ActionBar
            target="bi"
            scope={{ kind: "company", id: co.id }}
            googleQuery={co.legal_name || co.operating_name || ""}
            onEdit={() => setEditing(true)}
            onDelete={() => void deleteCompany()}
            editTestId="bi-company-edit-button"
            deleteTestId="bi-company-delete-button"
            onChanged={refresh}
          />
        )}

        {actionError && (
          <div style={{ marginTop: 8, color: "var(--ui-text-danger)", fontSize: 12 }} role="status">
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
                  background: "var(--accent)",
                  color: "#fff",
                  borderColor: "var(--accent)",
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
          <div>
            {/* BF_PORTAL_v856_CRM_UNIFY - every company detail (record, else the latest application), editable; tags. */}
            <CrmCompanyTagEditor backend={BI_CRM_BACKEND} companyId={co.id} catalogue={tagCatalogue} refreshKey={refreshKey} />
            <CrmCompanyDetails backend={BI_CRM_BACKEND} companyId={co.id} refreshKey={refreshKey} onSaved={refresh} />
          </div>
        )}
      </aside>

      {/* MAIN — applications */}
      <main style={mainCol} data-testid="bi-company-main">
        <CrmDuplicatesBanner backend={BI_CRM_BACKEND} entity="company" id={id} />{/* BF_PORTAL_v856_CRM_UNIFY */}
        <CrmAiSummary backend={BI_CRM_BACKEND} entity="company" id={id} />{/* BF_PORTAL_v856_CRM_UNIFY - same spot as on a contact */}
        <BICompanyActivity companyId={co.id} refreshKey={refreshKey} />
        <div style={{ ...panel, marginTop: 16 }}>
          <div style={panelHeader}>
            <h3 style={{ margin: 0 }}>Applications</h3>
            <span style={badge}>{co.application_count}</span>
          </div>
          {data.applications.length === 0 ? (
            <p style={{ color: "var(--ui-text-muted)", padding: 12 }}>
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
                      style={{ color: "var(--ui-accent-blue)", fontWeight: 600 }}
                    >
                      {a.application_code || a.id.slice(0, 8)}
                    </Link>
                    <span style={{ color: "var(--ui-text-muted)", fontSize: 12 }}>
                      {new Date(a.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div style={{ marginTop: 4, color: "var(--ui-text-muted)", fontSize: 13 }}>
                    {a.stage ? a.stage.replace(/_/g, " ") : "—"}
                    {a.status && (
                      <span style={{ marginLeft: 8, color: "var(--ui-text-muted)" }}>
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

      {/* BF_PORTAL_v856_CRM_UNIFY - RIGHT RAIL: everyone linked to the company, grouped by role (same as every CRM). */}
      <aside style={rail} data-testid="bi-company-rail-right">
        <CrmCompanyPeople backend={BI_CRM_BACKEND} companyId={co.id} refreshKey={refreshKey} />
        <div style={{ ...subtle, marginTop: 8 }}>{co.contact_count} contact(s) at this company</div>
      </aside>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={fieldLabel}>{label}</div>
      <div style={{ color: "var(--ui-text)" }}>{value || "—"}</div>
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
          border: "1px solid var(--ui-border)",
          borderRadius: 4,
          background: "var(--ui-surface-strong)",
          color: "var(--ui-text)",
          fontSize: 13,
        }}
        aria-label={props.label}
      />
    </div>
  );
}

const rail: CSSProperties = {
  background: "var(--ui-surface-strong)",
  border: "1px solid var(--ui-border-soft)",
  borderRadius: 6,
  padding: 16,
};
const mainCol: CSSProperties = { minWidth: 0 };
const panel: CSSProperties = {
  background: "var(--ui-surface-strong)",
  border: "1px solid var(--ui-border-soft)",
  borderRadius: 6,
  padding: 0,
};
const panelHeader: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "12px 16px",
  borderBottom: "1px solid var(--ui-border-soft)",
  background: "var(--ui-surface-muted)",
};
const badge: CSSProperties = {
  background: "var(--ui-surface-muted)", // BF_PORTAL_v789_CONTRAST - was --ui-surface text on --ui-border
  color: "var(--ui-text)",
  border: "1px solid var(--ui-border)",
  padding: "2px 8px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 600,
};
const backLink: CSSProperties = {
  color: "var(--ui-accent-blue)",
  fontSize: 14,
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  marginBottom: 12,
};
const subtle: CSSProperties = {
  color: "var(--ui-text-muted)",
  fontSize: 13,
  marginBottom: 12,
};
const fieldsBlock: CSSProperties = {
  marginTop: 16,
  paddingTop: 16,
  borderTop: "1px solid var(--ui-border-soft)",
};
const fieldLabel: CSSProperties = {
  fontSize: 11,
  color: "var(--ui-text-muted)",
  textTransform: "uppercase",
};
const actionBtn: CSSProperties = {
  border: "1px solid var(--ui-border)",
  background: "var(--ui-surface-strong)",
  color: "var(--ui-text)",
  borderRadius: 6,
  padding: "6px 12px",
  fontSize: 13,
  cursor: "pointer",
};
const appRow: CSSProperties = {
  padding: "12px 16px",
  borderBottom: "1px solid var(--ui-border-soft)",
};
const contactRow: CSSProperties = {
  padding: "8px 0",
  borderBottom: "1px solid var(--ui-surface-muted)",
};
