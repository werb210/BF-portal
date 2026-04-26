import { useMemo, useState, type CSSProperties } from "react";
import { api } from "@/api";
import ModalFooterWithDelete from "@/components/ModalFooterWithDelete";
import FormField from "@/components/forms/FormField";
import PhoneInput from "@/components/forms/PhoneInput";
import RegionSelect from "@/components/forms/RegionSelect";

type Props = {
  onClose: () => void;
  onSaved?: () => void;
  onCreated?: (company: { id?: string; name: string }) => void;
};

type FormState = {
  name: string;
  dba_name: string;
  legal_name: string;
  business_structure: string;
  address_street: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  address_country: "CA" | "US";
  phone: string;
  email: string;
  website: string;
  start_date: string;
  employee_count: number;
  estimated_annual_revenue: string;
};

const initialState: FormState = {
  name: "",
  dba_name: "",
  legal_name: "",
  business_structure: "",
  address_street: "",
  address_city: "",
  address_state: "",
  address_zip: "",
  address_country: "CA",
  phone: "",
  email: "",
  website: "",
  start_date: "",
  employee_count: 0,
  estimated_annual_revenue: "",
};

const structures = ["Sole Prop", "Partnership", "LLC", "Corporation", "S Corporation", "Non-Profit"];

export default function CreateCompanyModal({ onClose, onSaved, onCreated }: Props) {
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const canSave = useMemo(() => form.name.trim().length > 0 && !saving, [form.name, saving]);

  const save = async () => {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Company Name is required";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        dba_name: form.dba_name.trim() || undefined,
        legal_name: form.legal_name.trim() || undefined,
        business_structure: form.business_structure || undefined,
        address_street: form.address_street.trim() || undefined,
        address_city: form.address_city.trim() || undefined,
        address_state: form.address_state || undefined,
        address_zip: form.address_zip.trim() || undefined,
        address_country: form.address_country,
        phone: form.phone || undefined,
        email: form.email.trim() || undefined,
        website: form.website.trim() || undefined,
        start_date: form.start_date || undefined,
        employee_count: Number.isFinite(form.employee_count) ? form.employee_count : undefined,
        estimated_annual_revenue: form.estimated_annual_revenue ? Number(form.estimated_annual_revenue.replace(/[^\d.-]/g, "")) : undefined,
      };
      const created = await api.post<{ id?: string; name?: string }>("/api/companies", payload);
      try { window.alert("Company created successfully"); } catch {}
      onSaved?.();
      onCreated?.({ id: created?.id, name: created?.name ?? form.name.trim() });
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
    <div style={overlay}>
      <div style={modal}>
        <h3 style={{ marginTop: 0 }}>Create Company</h3>

        <FormField label="Company Name" required error={errors.name}><input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} style={input} /></FormField>
        <FormField label="Business Name (DBA)" error={errors.dba_name}><input value={form.dba_name} onChange={(e) => setForm((p) => ({ ...p, dba_name: e.target.value }))} style={input} /></FormField>
        <FormField label="Business Legal Name" error={errors.legal_name}><input value={form.legal_name} onChange={(e) => setForm((p) => ({ ...p, legal_name: e.target.value }))} style={input} /></FormField>
        <FormField label="Business Structure" error={errors.business_structure}>
          <select value={form.business_structure} onChange={(e) => setForm((p) => ({ ...p, business_structure: e.target.value }))} style={input}>
            <option value="">Select structure</option>
            {structures.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </FormField>
        <FormField label="Business Address" error={errors.address_street}><input value={form.address_street} onChange={(e) => setForm((p) => ({ ...p, address_street: e.target.value }))} style={input} /></FormField>
        <FormField label="City" error={errors.address_city}><input value={form.address_city} onChange={(e) => setForm((p) => ({ ...p, address_city: e.target.value }))} style={input} /></FormField>
        <FormField label="Country" error={errors.address_country}>
          <select value={form.address_country} onChange={(e) => setForm((p) => ({ ...p, address_country: e.target.value as "CA" | "US", address_state: "" }))} style={input}>
            <option value="CA">Canada</option><option value="US">United States</option>
          </select>
        </FormField>
        <FormField label="State / Province" error={errors.address_state}><RegionSelect country={form.address_country} value={form.address_state} onChange={(next) => setForm((p) => ({ ...p, address_state: next }))} /></FormField>
        <FormField label="ZIP / Postal Code" error={errors.address_zip}><input value={form.address_zip} onChange={(e) => setForm((p) => ({ ...p, address_zip: e.target.value }))} style={input} /></FormField>
        <FormField label="Business Phone" error={errors.phone}><PhoneInput country={form.address_country} value={form.phone} onChange={(next) => setForm((p) => ({ ...p, phone: next }))} /></FormField>
        <FormField label="Business Email" error={errors.email}><input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} style={input} /></FormField>
        <FormField label="Business Website" error={errors.website}><input type="url" value={form.website} onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))} style={input} /></FormField>
        <FormField label="Business Start Date" error={errors.start_date}><input type="date" value={form.start_date} onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))} style={input} /></FormField>
        <FormField label="Number of Employees" error={errors.employee_count}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button type="button" style={stepBtn} onClick={() => setForm((p) => ({ ...p, employee_count: Math.max(0, p.employee_count - 1) }))}>-</button>
            <input type="number" value={form.employee_count} onChange={(e) => setForm((p) => ({ ...p, employee_count: Number(e.target.value) || 0 }))} style={{ ...input, textAlign: "center" }} />
            <button type="button" style={stepBtn} onClick={() => setForm((p) => ({ ...p, employee_count: p.employee_count + 1 }))}>+</button>
          </div>
        </FormField>
        <FormField label="Estimated Yearly Revenue" error={errors.estimated_annual_revenue}><input type="text" inputMode="decimal" value={form.estimated_annual_revenue} onChange={(e) => setForm((p) => ({ ...p, estimated_annual_revenue: e.target.value }))} style={input} placeholder="$0.00" /></FormField>

        <ModalFooterWithDelete onCancel={onClose} onSave={() => void save()} onDelete={undefined} saveLabel={saving ? "Saving…" : "Save"} saveDisabled={!canSave} />
      </div>
    </div>
  );
}

const overlay: CSSProperties = { position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)", display: "grid", placeItems: "center", zIndex: 50 };
const modal: CSSProperties = { width: "min(760px, 95vw)", maxHeight: "90vh", overflowY: "auto", background: "#fff", borderRadius: 12, padding: 16 };
const input: CSSProperties = { width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, background: "#fff", color: "#000" };
const stepBtn: CSSProperties = { width: 32, height: 32, borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", color: "#000" };
