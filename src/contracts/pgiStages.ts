export const PGI_STAGES = [
  "received",
  "documents_pending",
  "under_review",
  "quoted",
  "bound",
  "declined"
] as const;

export type PGIStage = typeof PGI_STAGES[number];

export const PGI_STAGE_LABEL: Record<string, string> = {
  received: "Received",
  new_application: "Received",
  documents_pending: "Documents Pending",
  under_review: "Under Review",
  quoted: "Quoted",
  bound: "Bound",
  approved: "Bound",
  policy_issued: "Bound",
  declined: "Declined"
};
