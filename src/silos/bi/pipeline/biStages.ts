// BF_PORTAL_BLOCK_BI_ROUND8_STAGES_v1 -- 10-stage spec taxonomy
// per BI_SUBMISSION_PIPELINE_V1.md sec 3, locked ruling 22, with
// legacy 8-stage IDs kept as aliases that resolve to the new IDs.
// During the BI-Server migration window some rows still carry the
// legacy `new_application` / `documents_pending` / `under_review`
// / `docs_rejected` / `sent_to_pgi` / `quoted` / `bound` values.
// biStage() resolves either set to a label and badge.
//
// Staff portal: 10 stages, including document_review (staff-only).
// Lender + Referrer portals: 9 stages (no document_review).

export type BiStageId =
  | "created"
  | "in_progress"
  | "document_review"
  | "ready_for_submission"
  | "submitted"
  | "under_review"
  | "information_required"
  | "approved"
  | "declined"
  | "policy_issued";

export type BiStage = {
  id: BiStageId;
  label: string;
  description: string;
  badgeClass: string;
  color: string;
  order: number;
  isTerminal: boolean;
  isPgiDriven: boolean;
  isStaffOnly: boolean;
};

export const BI_STAGES: readonly BiStage[] = [
  { id: "created",              label: "New",                    description: "Score pass; full application not started",                            badgeClass: "bg-slate-500/20 text-slate-200",     color: "slate", order: 1,  isTerminal: false, isPgiDriven: false, isStaffOnly: false },
  { id: "in_progress",          label: "In progress",            description: "Applicant working through the 45-question form",                       badgeClass: "bg-sky-500/20 text-sky-200",         color: "sky", order: 2,  isTerminal: false, isPgiDriven: false, isStaffOnly: false },
  // BF_PORTAL_BLOCK_82_PIPELINE_SIMPLIFY_v1 - relabel; this is the only column staff touches on public apps.
  { id: "document_review",      label: "Documents",              description: "Staff accept/reject docs; public source only",                         badgeClass: "bg-amber-500/25 text-amber-200",     color: "amber", order: 3,  isTerminal: false, isPgiDriven: false, isStaffOnly: true  },
  { id: "ready_for_submission", label: "Ready for carrier",      description: "All docs accepted; auto-forwards or staff sends",                     badgeClass: "bg-cyan-500/25 text-cyan-200",       color: "cyan", order: 4,  isTerminal: false, isPgiDriven: false, isStaffOnly: false },
  { id: "submitted",            label: "Submitted to carrier",   description: "Forwarded to PGI; awaiting webhook",                                  badgeClass: "bg-indigo-500/25 text-indigo-200",   color: "indigo", order: 5,  isTerminal: false, isPgiDriven: false, isStaffOnly: false },
  { id: "under_review",         label: "Under review",           description: "PGI quoted; quote on file but not yet bound",                         badgeClass: "bg-purple-500/25 text-purple-200",   color: "purple", order: 6,  isTerminal: false, isPgiDriven: true,  isStaffOnly: false },
  { id: "information_required", label: "Info required",          description: "PGI requested additional information",                                badgeClass: "bg-orange-500/25 text-orange-200",   color: "orange", order: 7,  isTerminal: false, isPgiDriven: true,  isStaffOnly: false },
  { id: "approved",             label: "Approved",               description: "Reserved; carrier policy.bound lands directly in policy_issued",       badgeClass: "bg-emerald-500/20 text-emerald-200", color: "emerald", order: 8,  isTerminal: false, isPgiDriven: true,  isStaffOnly: false },
  { id: "declined",             label: "Declined",               description: "PGI declined -- terminal",                                            badgeClass: "bg-rose-500/25 text-rose-200",       color: "rose", order: 9,  isTerminal: true,  isPgiDriven: true,  isStaffOnly: false },
  { id: "policy_issued",        label: "Policy issued",          description: "policy.bound webhook -- terminal success",                            badgeClass: "bg-emerald-500/30 text-emerald-200", color: "emerald", order: 10, isTerminal: true,  isPgiDriven: true,  isStaffOnly: false },
] as const;

// Legacy 8-stage IDs the failing BI-Server migration is supposed
// to map. Until the migration succeeds, rows may still carry these
// values; resolve them to the new IDs so labels render correctly.
const LEGACY_ALIASES: Record<string, BiStageId> = {
  new_application:     "created",
  documents_pending:   "document_review",
  requires_docs:       "document_review",
  internal_review:     "ready_for_submission",
  submitted_to_insurer:"submitted",
  sent_to_pgi:         "submitted",
  docs_rejected:       "document_review",
  quoted:              "under_review",
  bound:               "policy_issued",
  claim:               "policy_issued",
};

// BF_PORTAL_BLOCK_82_PIPELINE_SIMPLIFY_v1 - staff pipeline = one staff
// action column (Documents) + 6 carrier columns. created/in_progress/
// ready_for_submission are hidden: applicant-side or transient. Order
// matters: Documents leftmost.
export const BI_VISIBLE_PIPELINE_STAGES: readonly BiStageId[] = [
  "document_review",
  "submitted",
  "under_review",
  "information_required",
  "approved",
  "declined",
  "policy_issued",
] as const;

export const BI_LENDER_VISIBLE_STAGES: readonly BiStageId[] = [
  "created","in_progress","ready_for_submission",
  "submitted","under_review","information_required",
  "approved","declined","policy_issued",
] as const;

// Stages where staff actively act. Outside this set the application
// is either pre-staff (created/in_progress), already submitted, or
// driven by carrier webhooks.
export const BI_STAFF_INTERACTIVE_STAGES: readonly BiStageId[] = [
  "document_review",
  "ready_for_submission",
  "information_required",
] as const;

const BY_ID = (() => {
  const m = {} as Record<BiStageId, BiStage>;
  for (const s of BI_STAGES) m[s.id] = s;
  return m;
})();

export function resolveStageId(id: string | null | undefined): BiStageId | null {
  if (!id) return null;
  if (id in BY_ID) return id as BiStageId;
  if (id in LEGACY_ALIASES) return LEGACY_ALIASES[id] as BiStageId;
  return null;
}

export function biStage(id: string | null | undefined): BiStage | undefined {
  const resolved = resolveStageId(id);
  return resolved ? BY_ID[resolved] : undefined;
}

export function biStageLabel(id: string | null | undefined): string {
  if (!id) return "—";
  return biStage(id)?.label ?? String(id);
}

export function biStageBadgeClass(id: string | null | undefined): string {
  return biStage(id)?.badgeClass ?? "bg-white/10";
}

const MANUAL_TRANSITIONS: Record<BiStageId, BiStageId[]> = {
  created:              ["in_progress"],
  in_progress:          ["document_review", "ready_for_submission"],
  document_review:      ["ready_for_submission"], // last-doc-accept auto-fires
  ready_for_submission: ["submitted"],            // "Send to carrier"
  submitted:            [],                       // webhooks own from here
  under_review:         [],
  information_required: [],
  approved:             [],
  declined:             [],
  policy_issued:        [],
};

export function canTransitionManually(from: string, to: string): boolean {
  const f = resolveStageId(from);
  const t = resolveStageId(to);
  if (!f || !t) return false;
  return MANUAL_TRANSITIONS[f].includes(t);
}
