import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import { api } from "@/api";
import { getErrorMessage } from "@/utils/errors";

type Method = "email" | "api" | "google_sheet";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: (lenderId: string) => void;
};

type FormState = {
  name: string;
  streetAddress: string;
  cityStateZip: string;
  mainPhone: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  submissionMethod: Method;
  submissionEmail: string;
  apiEndpoint: string;
  apiKey: string;
  googleSheetId: string;
};

const EMPTY: FormState = {
  name: "",
  streetAddress: "",
  cityStateZip: "",
  mainPhone: "",
  contactName: "",
  contactPhone: "",
  contactEmail: "",
  submissionMethod: "email",
  submissionEmail: "",
  apiEndpoint: "",
  apiKey: "",
  googleSheetId: "",
};

function validate(s: FormState): Record<string, string> {
  const e: Record<string, string> = {};
  if (!s.name.trim()) e.name = "Lender name is required.";
  if (!s.streetAddress.trim()) e.streetAddress = "Street address is required.";
  if (!s.cityStateZip.trim()) e.cityStateZip = "City / State / ZIP is required.";
  if (!s.mainPhone.trim()) e.mainPhone = "Main phone is required.";
  if (!s.contactName.trim()) e.contactName = "Contact person is required.";
  if (!s.contactPhone.trim()) e.contactPhone = "Contact phone is required.";
  if (!s.contactEmail.trim()) e.contactEmail = "Contact email is required.";
  if (s.contactEmail && !s.contactEmail.includes("@")) e.contactEmail = "Enter a valid email.";
  if (s.submissionMethod === "email" && !s.submissionEmail.trim()) {
    e.submissionEmail = "Submission email is required for email method.";
  }
  if (s.submissionMethod === "email" && s.submissionEmail && !s.submissionEmail.includes("@")) {
    e.submissionEmail = "Enter a valid email.";
  }
  if (s.submissionMethod === "api") {
    if (!s.apiEndpoint.trim()) e.apiEndpoint = "API endpoint is required.";
    if (!s.apiKey.trim()) e.apiKey = "API key is required.";
  }
  if (s.submissionMethod === "google_sheet" && !s.googleSheetId.trim()) {
    e.googleSheetId = "Google Sheet ID is required.";
  }
  return e;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  fontSize: 14,
};

function Field(p: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="ui-field" style={{ marginBottom: 12 }}>
      {p.label ? (
        <label className="ui-field__label" style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
          {p.label}
        </label>
      ) : null}
      {p.children}
      {p.error ? (
        <div className="ui-field__error" style={{ color: "#b91c1c", fontSize: 12, marginTop: 2 }}>
          {p.error}
        </div>
      ) : null}
    </div>
  );
}

export default function CreateLenderModal({ open, onClose, onCreated }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) return null;
  const set = (patch: Partial<FormState>) => setForm((p) => ({ ...p, ...patch }));

  const onSubmit = async () => {
    const e = validate(form);
    setErrors(e);
    setSubmitErr(null);
    if (Object.keys(e).length > 0) return;
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        street_address: form.streetAddress.trim(),
        city_state_zip: form.cityStateZip.trim(),
        main_phone: form.mainPhone.trim(),
        contact_name: form.contactName.trim(),
        contact_phone: form.contactPhone.trim(),
        contact_email: form.contactEmail.trim(),
        submission_method: form.submissionMethod,
      };
      if (form.submissionMethod === "email") {
        payload.submission_email = form.submissionEmail.trim();
      }
      if (form.submissionMethod === "api") {
        payload.api_endpoint = form.apiEndpoint.trim();
        payload.api_key = form.apiKey.trim();
      }
      if (form.submissionMethod === "google_sheet") {
        payload.google_sheet_id = form.googleSheetId.trim();
      }
      const resp = await api.post<{ id: string }>("/api/lenders", payload);
      onCreated?.(resp?.id ?? "");
      setForm(EMPTY);
      onClose();
    } catch (err) {
      setSubmitErr(getErrorMessage(err, "Unable to create lender."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Create New Lender" onClose={onClose}>
      <div data-testid="create-lender-form" style={{ padding: 4 }}>
        <Field label="Lender Name *" error={errors.name}>
          <input data-testid="lender-name" value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Enter lender name" style={inputStyle} />
        </Field>

        <Field label="Lender Address *" error={errors.streetAddress}>
          <input data-testid="lender-street" value={form.streetAddress} onChange={(e) => set({ streetAddress: e.target.value })} placeholder="Enter street address" style={inputStyle} />
        </Field>
        <Field label="" error={errors.cityStateZip}>
          <input data-testid="lender-citystatezip" value={form.cityStateZip} onChange={(e) => set({ cityStateZip: e.target.value })} placeholder="City, State / Province, ZIP / Postal Code" style={inputStyle} />
        </Field>

        <Field label="Lender Main Phone Number *" error={errors.mainPhone}>
          <input data-testid="lender-mainphone" value={form.mainPhone} onChange={(e) => set({ mainPhone: e.target.value })} placeholder="(___) ___-____" style={inputStyle} />
        </Field>

        <h3 style={{ margin: "12px 0 8px", fontSize: 15 }}>Primary Contact</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Contact Person *" error={errors.contactName}>
            <input data-testid="contact-name" value={form.contactName} onChange={(e) => set({ contactName: e.target.value })} placeholder="Enter contact name" style={inputStyle} />
          </Field>
          <Field label="Contact Phone Number (OTP) *" error={errors.contactPhone}>
            <input data-testid="contact-phone" value={form.contactPhone} onChange={(e) => set({ contactPhone: e.target.value })} placeholder="(___) ___-____" style={inputStyle} />
          </Field>
        </div>
        <Field label="Contact Email *" error={errors.contactEmail}>
          <input data-testid="contact-email" value={form.contactEmail} onChange={(e) => set({ contactEmail: e.target.value })} placeholder="Enter contact email" style={inputStyle} />
        </Field>

        <Field label="Submission Method *">
          <Select
            label=""
            hideLabel
            value={form.submissionMethod}
            onChange={(e) => set({ submissionMethod: e.target.value as Method })}
            options={[
              { value: "email", label: "Email" },
              { value: "api", label: "API" },
              { value: "google_sheet", label: "Google Sheet (Merchant Growth)" },
            ]}
          />
        </Field>

        {form.submissionMethod === "email" && (
          <Field label="Submission Email" error={errors.submissionEmail}>
            <input data-testid="submission-email" value={form.submissionEmail} onChange={(e) => set({ submissionEmail: e.target.value })} placeholder="submissions@lender.com" style={inputStyle} />
          </Field>
        )}

        {form.submissionMethod === "api" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="API Endpoint" error={errors.apiEndpoint}>
              <input data-testid="api-endpoint" value={form.apiEndpoint} onChange={(e) => set({ apiEndpoint: e.target.value })} placeholder="https://api.lender.com/submit" style={inputStyle} />
            </Field>
            <Field label="API Key" error={errors.apiKey}>
              <input data-testid="api-key" value={form.apiKey} onChange={(e) => set({ apiKey: e.target.value })} placeholder="Enter API key" style={inputStyle} />
            </Field>
          </div>
        )}

        {form.submissionMethod === "google_sheet" && (
          <Field label="Google Sheet ID" error={errors.googleSheetId}>
            <input data-testid="google-sheet-id" value={form.googleSheetId} onChange={(e) => set({ googleSheetId: e.target.value })} placeholder="Enter Google Sheet ID" style={inputStyle} />
          </Field>
        )}

        {submitErr ? <div style={{ color: "#b91c1c", fontSize: 13, marginTop: 8 }}>{submitErr}</div> : null}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="primary" onClick={() => void onSubmit()} disabled={busy} data-testid="create-lender-submit">
            {busy ? "Creating…" : "Create Lender"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
