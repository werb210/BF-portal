// BI_PIPELINE_ALIGN_v57 — BI pipeline stages aligned with PGI carrier API.
// BF_PORTAL_BLOCK_v47_BI_SILO_PIPELINE_v1 — added 'docs_rejected' and
// 'sent_to_pgi' to match the operator-locked 8-stage spec from BI Issues 5.
//   submitted_no_docs (== new_application)  ← BI staff interactive
//   docs_uploaded     (== documents_pending) ← BI staff interactive
//   docs_in_review    (== under_review)      ← BI staff interactive (accept/reject docs)
//   docs_rejected     (NEW)                  ← BI staff interactive (kicks back to applicant)
//   sent_to_pgi       (NEW)                  ← read-only after this point
//   quoted                                    ← PGI-driven webhook
//   bound                                     ← PGI-driven webhook (terminal success)
//   declined                                  ← PGI-driven webhook (terminal failure)
// Lender-direct submissions skip new_application/documents_pending/
// under_review/docs_rejected entirely and land directly in sent_to_pgi
// with the carrier POST fired automatically.
//
// Lifecycle:
//   new_application
//     → documents_pending           (docs missing)
//     → under_review                (staff reviewing docs)
//       → submitted                 (Submit-to-Carrier — POST /applications/)
//         → quoted                  (PGI webhook: application.quoted)
//           → bound                 (PGI webhook: policy.bound) — terminal success
//         → declined                (PGI webhook: application.declined) — terminal
//   claim                           (PGI webhook: claim.* — separate track)
//
// Lender-direct submissions skip under_review and go straight to submitted.
// Stages quoted/bound/declined/claim are PGI-driven and NEVER set manually.

export type BiStageId =
  | "new_application"
  | "documents_pending"
  | "under_review"
  | "docs_rejected"
  | "sent_to_pgi"
  | "submitted"
  | "quoted"
  | "bound"
  | "declined"
  | "claim";

export type BiStage = {
  id: BiStageId;
  label: string;
  description: string;
  color: string;
  badgeClass: string;
  order: number;
  isTerminal: boolean;
  isPgiDriven: boolean;
};

export const BI_STAGES: readonly BiStage[] = [
  { id: "new_application",   label: "Submitted (no docs)", description: "Applicant submitted without uploading documents",  color: "bg-slate-500/15 text-slate-200",     badgeClass: "bg-slate-500/20",     order: 1, isTerminal: false, isPgiDriven: false },
  { id: "documents_pending", label: "Docs uploaded",       description: "Applicant has uploaded documents; awaiting staff review", color: "bg-amber-500/15 text-amber-200", badgeClass: "bg-amber-500/25",     order: 2, isTerminal: false, isPgiDriven: false },
  { id: "under_review",      label: "Docs in review",      description: "Staff actively reviewing the documents",            color: "bg-blue-500/15 text-blue-200",       badgeClass: "bg-blue-500/25",      order: 3, isTerminal: false, isPgiDriven: false },
  { id: "docs_rejected",     label: "Docs rejected",       description: "Staff rejected one or more documents; applicant must re-upload", color: "bg-rose-500/15 text-rose-200", badgeClass: "bg-rose-500/25",  order: 4, isTerminal: false, isPgiDriven: false },
  { id: "sent_to_pgi",       label: "Sent to PGI",         description: "Forwarded to carrier; awaiting underwriter response", color: "bg-indigo-500/15 text-indigo-200", badgeClass: "bg-indigo-500/25",  order: 5, isTerminal: false, isPgiDriven: false },
  // Retained for legacy data only — pre-v47 rows used `submitted` for what
  // is now `sent_to_pgi`. Hidden from the visible pipeline columns by
  // BIPipeline.tsx but kept here so old rows still have a valid label.
  { id: "submitted",         label: "Submitted to Carrier",description: "(legacy) Sent to PGI",                              color: "bg-indigo-500/15 text-indigo-200",   badgeClass: "bg-indigo-500/25",    order: 5, isTerminal: false, isPgiDriven: false },
  { id: "quoted",            label: "Quoted",              description: "PGI quoted; awaiting acceptance",                   color: "bg-purple-500/15 text-purple-200",   badgeClass: "bg-purple-500/25",    order: 6, isTerminal: false, isPgiDriven: true  },
  { id: "bound",             label: "Bound",               description: "Policy bound — complete",                           color: "bg-emerald-500/15 text-emerald-200", badgeClass: "bg-emerald-500/25",   order: 7, isTerminal: true,  isPgiDriven: true  },
  { id: "declined",          label: "Declined",            description: "PGI declined — terminal",                           color: "bg-rose-500/15 text-rose-200",       badgeClass: "bg-rose-500/25",      order: 8, isTerminal: true,  isPgiDriven: true  },
  { id: "claim",             label: "Claim",               description: "Active claim",                                      color: "bg-orange-500/15 text-orange-200",   badgeClass: "bg-orange-500/25",    order: 9, isTerminal: false, isPgiDriven: true  },
] as const;

// BF_PORTAL_BLOCK_v47_BI_SILO_PIPELINE_v1 — operator-locked spec: BI
// staff only interact with the first 4 stages. Stages 5+ (sent_to_pgi
// and beyond) are read-only in the staff UI. This constant drives
// column visibility in BIPipeline.tsx and the accept/reject button
// gating in BIDocumentList.tsx.
export const BI_STAFF_INTERACTIVE_STAGES: readonly BiStageId[] = [
  "new_application",
  "documents_pending",
  "under_review",
  "docs_rejected",
] as const;

// The 8 columns the operator wants visible in the pipeline view (in
// order). `submitted` and `claim` are legacy/parallel-track and not
// shown as columns; rows landing in those stages still render via the
// stage label, just under a different visual treatment.
export const BI_VISIBLE_PIPELINE_STAGES: readonly BiStageId[] = [
  "new_application",
  "documents_pending",
  "under_review",
  "docs_rejected",
  "sent_to_pgi",
  "quoted",
  "bound",
  "declined",
] as const;

const BY_ID = (() => {
  const m = {} as Record<BiStageId, BiStage>;
  for (const s of BI_STAGES) m[s.id] = s;
  return m;
})();

export function biStage(id: BiStageId | string): BiStage | undefined {
  return BY_ID[id as BiStageId];
}
export function biStageLabel(id: BiStageId | string | null | undefined): string {
  if (!id) return "—";
  return BY_ID[id as BiStageId]?.label ?? id;
}
export function biStageBadgeClass(id: BiStageId | string | null | undefined): string {
  if (!id) return "bg-white/10";
  return BY_ID[id as BiStageId]?.badgeClass ?? "bg-white/10";
}

const MANUAL_TRANSITIONS: Record<BiStageId, BiStageId[]> = {
  new_application:   ["documents_pending", "under_review"],
  documents_pending: ["under_review"],
  under_review:      ["documents_pending", "docs_rejected", "sent_to_pgi"],
  docs_rejected:     ["documents_pending", "under_review"],
  sent_to_pgi:       [],
  submitted:         [],
  quoted:            [],
  bound:             [],
  declined:          [],
  claim:             [],
};

export function canTransitionManually(from: BiStageId | string, to: BiStageId | string): boolean {
  const allowed = MANUAL_TRANSITIONS[from as BiStageId];
  return Array.isArray(allowed) && allowed.includes(to as BiStageId);
}
