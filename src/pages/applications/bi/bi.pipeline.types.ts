export type BIStageId =
  | "new_application"
  | "documents_pending"
  | "under_review"
  | "approved"
  | "declined"
  | "policy_issued";

export type BIPipelineApplication = {
  id: string;
  stage: BIStageId;
  business_name: string;
  primary_contact_name: string | null;
  core_score: "approve" | "decline" | "review" | null;
  annual_premium: number | null;
  coverage_amount: number | null;
  underwriter_ref: string | null;
  pgi_external_id: string | null;
  quote_summary: string | null;
  quote_expiry_at: string | null;
  created_at: string;
  updated_at: string;
  submitted_data?: Record<string, unknown> | null;
  documents?: Array<{ id: string; file_name: string; url: string; uploaded_at: string }>;
  notes?: Array<{ id: string; text: string; created_at: string; author_name?: string | null }>;
};

export type BIRequirementStatus = "received" | "waived" | "rejected" | "pending";

export type BIRequirementItem = {
  id: string;
  label: string;
  status: BIRequirementStatus;
};

export type BIActivityItem = {
  id: string;
  actor: string;
  event_type: string;
  summary: string;
  timestamp: string;
};

export type BIPipelineStage = {
  id: BIStageId;
  label: string;
  description: string;
  pgiOwned?: boolean;
};

export const BI_PIPELINE_STAGES: BIPipelineStage[] = [
  { id: "new_application", label: "New Application", description: "New submissions" },
  { id: "documents_pending", label: "Documents Pending", description: "Waiting on required docs" },
  { id: "under_review", label: "Under Review", description: "PGI is reviewing", pgiOwned: true },
  { id: "approved", label: "Approved", description: "Approved outcome", pgiOwned: true },
  { id: "declined", label: "Declined", description: "Declined outcome" },
  { id: "policy_issued", label: "Policy Issued", description: "Policy issued", pgiOwned: true }
];

export const MANUAL_MOVEABLE_STAGES: BIStageId[] = [
  "new_application",
  "documents_pending",
  "declined"
];
