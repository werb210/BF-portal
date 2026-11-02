// BF_PORTAL_v872_KYC - ID and address verification (BF-Server /api/kyc). Shapes match src/routes/kyc.ts there.
import { api } from "@/api";

export type KycStatus = "requested" | "in_progress" | "processing" | "approved" | "declined" | "review" | "expired" | "cancelled" | "error";
export type KycReason = { code: string; severity: "info" | "amber" | "red"; text: string };

export type Verification = {
  id: string;
  application_id: string;
  contact_id: string | null;
  person_name: string | null;
  person_role: string;
  provider: "onfido" | "manual";
  status: KycStatus;
  decision_source: "vendor" | "staff" | null;
  reasons: KycReason[];
  checks: Record<string, string>;
  document_ids: string[];
  has_id_details: boolean;
  requested_via: string;
  requested_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  reviewed_at: string | null;
  review_note: string | null;
};

export type FilePerson = { contact_id: string; role: string; name: string; has_phone: boolean };
export type ProviderInfo = { key: "onfido" | "manual"; label: string; configured: boolean; hosted: boolean };

export type KycOverview = { application_id: string; provider: ProviderInfo; people: FilePerson[]; verifications: Verification[] };
export type IdDetails = {
  first_name?: string | null; last_name?: string | null; date_of_birth?: string | null; document_type?: string | null;
  document_number?: string | null; issuing_country?: string | null; issuing_state?: string | null; date_of_expiry?: string | null; address?: string | null;
};

export type KycSettings = { provider: "onfido" | "manual" | null; wizard_step: boolean; wizard_people: "applicant" | "applicant_and_guarantors"; updated_at: string | null };
export type KycSettingsView = {
  settings: KycSettings;
  active_provider: "onfido" | "manual";
  providers: Array<ProviderInfo & { settings: string[] }>;
  webhook_url: string;
};

const app = (id: string) => `/api/kyc/applications/${encodeURIComponent(id)}`;
const ver = (id: string) => `/api/kyc/verifications/${encodeURIComponent(id)}`;

export const kycApi = {
  overview: (applicationId: string) => api.get<KycOverview & { ok: boolean }>(app(applicationId)),
  request: (applicationId: string, contactId?: string | null) =>
    api.post<{ ok: boolean; created: boolean; verification: Verification }>(`${app(applicationId)}/requests`, contactId ? { contact_id: contactId } : {}),
  refresh: (id: string) => api.post<{ ok: boolean; verification: Verification }>(`${ver(id)}/refresh`, {}),
  decide: (id: string, decision: "approved" | "declined", note: string) =>
    api.post<{ ok: boolean; verification: Verification }>(`${ver(id)}/decision`, { decision, note }),
  cancel: (id: string) => api.post<{ ok: boolean }>(`${ver(id)}/cancel`, {}),
  idDetails: (id: string, full = false) => api.get<{ ok: boolean; details: IdDetails | null }>(`${ver(id)}/id-details${full ? "?full=1" : ""}`),
  settings: () => api.get<KycSettingsView & { ok: boolean }>("/api/kyc/settings"),
  saveSettings: (patch: Partial<{ provider: "auto" | "onfido" | "manual"; wizard_step: boolean; wizard_people: KycSettings["wizard_people"] }>) =>
    api.put<{ ok: boolean; settings: KycSettings }>("/api/kyc/settings", patch),
};

/** Plain words and readable colours (dark text on a light tint, fine in both themes). */
export const STATUS_LOOK: Record<KycStatus, { label: string; bg: string; fg: string; border: string }> = {
  requested: { label: "Sent to client", bg: "#e0e7ff", fg: "#1e1b4b", border: "#a5b4fc" },
  in_progress: { label: "Client started", bg: "#e0e7ff", fg: "#1e1b4b", border: "#a5b4fc" },
  processing: { label: "Checking", bg: "#e0e7ff", fg: "#1e1b4b", border: "#a5b4fc" },
  approved: { label: "Verified", bg: "#dcfce7", fg: "#14532d", border: "#86efac" },
  declined: { label: "Declined", bg: "#fee2e2", fg: "#7f1d1d", border: "#fca5a5" },
  review: { label: "Needs review", bg: "#fef3c7", fg: "#78350f", border: "#fcd34d" },
  expired: { label: "Not finished", bg: "#f1f5f9", fg: "#1e293b", border: "#cbd5e1" },
  cancelled: { label: "Cancelled", bg: "#f1f5f9", fg: "#1e293b", border: "#cbd5e1" },
  error: { label: "Error", bg: "#fee2e2", fg: "#7f1d1d", border: "#fca5a5" },
};

export const CHECK_LABEL: Record<string, string> = {
  document: "ID document", face: "Selfie matches ID", liveness: "Selfie liveness", identity_record: "Identity record",
  known_faces: "Repeat face", address: "Address", watchlist: "Watchlist",
};

export const OPEN: ReadonlySet<KycStatus> = new Set(["requested", "in_progress", "processing"]);
