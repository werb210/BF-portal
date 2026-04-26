import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { api } from "@/api";
import ModalFooterWithDelete from "@/components/ModalFooterWithDelete";
import FormField from "@/components/forms/FormField";
import PhoneInput from "@/components/forms/PhoneInput";
import RegionSelect from "@/components/forms/RegionSelect";
import CreateCompanyModal from "@/pages/crm/companies/CreateCompanyModal";

type Props = {
  open?: boolean;
  onClose: () => void;
  onSaved?: () => void;
};

type Company = { id: string; name: string };

type FormState = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address_street: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  address_country: "CA" | "US";
  dob: string;
  ssn: string;
  ownership_percent: string;
  role: "applicant" | "partner" | "guarantor" | "other" | "unknown";
  company_id: string;
  is_primary_applicant: boolean;
};

const initialState: FormState = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  address_street: "",
  address_city: "",
  address_state: "",
  address_zip: "",
  address_country: "CA",
  dob: "",
  ssn: "",
  ownership_percent: "",
  role: "unknown",
  company_id: "",
  is_primary_applicant: false,
};

function maskSsn(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 4) return digits;
  return `•••-••-${digits.slice(-4)}`;
}

export default function CreateContactModal({ open = true, onClose, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companySearch, setCompanySearch] = useState("");
  const [showCreateCompany, setShowCreateCompany] = useState(false);
  const [ssnFocused, setSsnFocused] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    api.get<{ data?: Company[] } | Company[]>("/api/companies")
      .then((r) => {
        const list = Array.isArray(r) ? r : (r?.data ?? []);
        if (!cancelled) {
          const normalized = list
            .map((c) => ({ id: c.id, name: String(c.name ?? "").trim() }))
            .filter((c) => c.id && c.name);
          setCompanies(normalized);
        }
      })
      .catch(() => !cancelled && setCompanies([]));
    return () => { cancelled = true; };
  }, [open]);

  const filteredCompanies = useMemo(() => {
    const q = companySearch.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter((company) => company.name.toLowerCase().includes(q));
  }, [companies, companySearch]);

  const canSave = useMemo(() => form.first_name.trim() && form.last_name.trim() && !saving, [form.first_name, form.last_name, saving]);

  if (!open) return null;

  const submit = async () => {
    const next: Record<string, string> = {};
    if (!form.first_name.trim()) next.first_name = "First Name is required";
    if (!form.last_name.trim()) next.last_name = "Last Name is required";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      await api.post("/api/crm/contacts", {
        ...form,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim() || undefined,
        address_street: form.address_street.trim() || undefined,
        address_city: form.address_city.trim() || undefined,
        address_state: form.address_state || undefined,
        address_zip: form.address_zip.trim() || undefined,
        dob: form.dob || undefined,
        ssn: form.ssn.trim() || undefined,
        ownership_percent: form.ownership_percent ? Number(form.ownership_percent) : undefined,
        company_id: form.company_id || undefined,
      });
      try { window.alert("Contact created successfully"); } catch {}
      onSaved?.();
      onClose();
    } catch (e: any) {
      if (e?.status === 400 && e?.details?.errors && typeof e.details.errors === "object") {
        setErrors(e.details.errors as Record<string, string>);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div style={overlay}>
        <div style={modal}>
          <h3 style={{ marginTop: 0 }}>Create Contact</h3>
          <FormField label="First Name" required error={errors.first_name}><input value={form.first_name} onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))} style={input} /></FormField>
          <FormField label="Last Name" required error={errors.last_name}><input value={form.last_name} onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))} style={input} /></FormField>
          <FormField label="Email" error={errors.email}><input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} style={input} /></FormField>
          <FormField label="Phone" error={errors.phone}><PhoneInput country={form.address_country} value={form.phone} onChange={(next) => setForm((p) => ({ ...p, phone: next }))} /></FormField>
          <FormField label="Street Address" error={errors.address_street}><input value={form.address_street} onChange={(e) => setForm((p) => ({ ...p, address_street: e.target.value }))} style={input} /></FormField>
          <FormField label="City" error={errors.address_city}><input value={form.address_city} onChange={(e) => setForm((p) => ({ ...p, address_city: e.target.value }))} style={input} /></FormField>
          <FormField label="Country" error={errors.address_country}><select value={form.address_country} onChange={(e) => setForm((p) => ({ ...p, address_country: e.target.value as "CA" | "US", address_state: "" }))} style={input}><option value="CA">Canada</option><option value="US">United States</option></select></FormField>
          <FormField label="State / Province" error={errors.address_state}><RegionSelect country={form.address_country} value={form.address_state} onChange={(next) => setForm((p) => ({ ...p, address_state: next }))} /></FormField>
          <FormField label="ZIP / Postal" error={errors.address_zip}><input value={form.address_zip} onChange={(e) => setForm((p) => ({ ...p, address_zip: e.target.value }))} style={input} /></FormField>
          <FormField label="Date of Birth" error={errors.dob}><input type="date" value={form.dob} onChange={(e) => setForm((p) => ({ ...p, dob: e.target.value }))} style={input} /></FormField>
          <FormField label="SSN / SIN" error={errors.ssn}><input value={ssnFocused ? form.ssn : maskSsn(form.ssn)} onFocus={() => setSsnFocused(true)} onBlur={() => setSsnFocused(false)} onChange={(e) => setForm((p) => ({ ...p, ssn: e.target.value }))} style={input} /></FormField>
          <FormField label="Ownership %" error={errors.ownership_percent}><input type="number" value={form.ownership_percent} onChange={(e) => setForm((p) => ({ ...p, ownership_percent: e.target.value }))} style={input} /></FormField>
          <FormField label="Role" error={errors.role}><select value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as FormState["role"] }))} style={input}><option value="unknown">Unknown</option><option value="applicant">Applicant</option><option value="partner">Partner</option><option value="guarantor">Guarantor</option><option value="other">Other</option></select></FormField>
          <FormField label="Company" error={errors.company_id}>
            <input value={companySearch} onChange={(e) => setCompanySearch(e.target.value)} style={input} placeholder="Search companies" />
            <select value={form.company_id} onChange={(e) => setForm((p) => ({ ...p, company_id: e.target.value }))} style={{ ...input, marginTop: 8 }}>
              <option value="">No company</option>
              {filteredCompanies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
            </select>
            <button type="button" onClick={() => setShowCreateCompany(true)} style={{ marginTop: 8, border: 0, background: "transparent", color: "#0d9b6c", textAlign: "left", padding: 0 }}>+ Create company</button>
          </FormField>
          <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}><input type="checkbox" checked={form.is_primary_applicant} onChange={(e) => setForm((p) => ({ ...p, is_primary_applicant: e.target.checked }))} />Primary applicant for this company?</label>

          <ModalFooterWithDelete onCancel={onClose} onSave={() => void submit()} onDelete={undefined} saveLabel={saving ? "Saving…" : "Save"} saveDisabled={!canSave} />
        </div>
      </div>

      {showCreateCompany && (
        <CreateCompanyModal
          onClose={() => setShowCreateCompany(false)}
          onSaved={() => {
            void api.get<{ data?: Company[] } | Company[]>("/api/companies")
              .then((r) => setCompanies(Array.isArray(r) ? r : (r?.data ?? [])))
              .catch(() => {});
          }}
          onCreated={(company) => {
            if (company.id) setForm((p) => ({ ...p, company_id: company.id ?? "" }));
            setShowCreateCompany(false);
          }}
        />
      )}
    </>
  );
}

const overlay: CSSProperties = { position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)", display: "grid", placeItems: "center", zIndex: 50 };
const modal: CSSProperties = { width: "min(760px, 95vw)", maxHeight: "90vh", overflowY: "auto", background: "#fff", borderRadius: 12, padding: 16 };
const input: CSSProperties = { width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, background: "#fff", color: "#000" };
