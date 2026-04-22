export type BIStageId =
  | "new_application"
  | "documents_pending"
  | "under_review"
  | "quoted"
  | "bound"
  | "approved"
  | "declined"
  | "policy_issued"
  | "claim";

export type BIQuoteSummary = {
  quote_number?: string | null;
  carrier?: string | null;
  deductible?: number | null;
  limits?: number | null;
  notes?: string | null;
  [key: string]: unknown;
};

export type BIPipelineApplication = {
  id: string;
  stage: BIStageId;
  business_name: string;
  primary_contact_name: string | null;
  core_score?: "approve" | "decline" | "review" | null;
  annual_premium?: number | null;
  coverage_amount?: number | null;
  underwriter_ref?: string | null;
  pgi_external_id?: string | null;
  quote_summary?: BIQuoteSummary | null;
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

export type BIRequirementHistoryItem = {
  id: string;
  requirement: string;
  old_status: BIRequirementStatus | null;
  new_status: BIRequirementStatus;
  changed_at: string;
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
  { id: "quoted", label: "Quoted", description: "Quote available", pgiOwned: true },
  { id: "bound", label: "Approved", description: "Policy bound", pgiOwned: true },
  { id: "declined", label: "Declined", description: "Declined outcome" },
  { id: "policy_issued", label: "Policy Issued", description: "Policy issued", pgiOwned: true },
  { id: "claim", label: "Claim", description: "Claim opened", pgiOwned: true }
];

export const MANUAL_MOVEABLE_STAGES: BIStageId[] = [
  "new_application",
  "documents_pending",
  "declined"
];
