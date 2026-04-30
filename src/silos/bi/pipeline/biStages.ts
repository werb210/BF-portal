// BI_PIPELINE_ALIGN_v57 — BI pipeline stages aligned with PGI carrier API.
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
  { id: "new_application",   label: "New",                 description: "Submitted, awaiting triage",                color: "bg-slate-500/15 text-slate-200",     badgeClass: "bg-slate-500/20",     order: 1, isTerminal: false, isPgiDriven: false },
  { id: "documents_pending", label: "Documents Pending",   description: "Waiting on applicant documents",            color: "bg-amber-500/15 text-amber-200",     badgeClass: "bg-amber-500/25",     order: 2, isTerminal: false, isPgiDriven: false },
  { id: "under_review",      label: "Internal Review",     description: "Staff reviewing documents",                 color: "bg-blue-500/15 text-blue-200",       badgeClass: "bg-blue-500/25",      order: 3, isTerminal: false, isPgiDriven: false },
  { id: "submitted",         label: "Submitted to Carrier",description: "Sent to PGI; awaiting response",            color: "bg-indigo-500/15 text-indigo-200",   badgeClass: "bg-indigo-500/25",    order: 4, isTerminal: false, isPgiDriven: false },
  { id: "quoted",            label: "Quoted",              description: "PGI quoted; awaiting acceptance",           color: "bg-purple-500/15 text-purple-200",   badgeClass: "bg-purple-500/25",    order: 5, isTerminal: false, isPgiDriven: true  },
  { id: "bound",             label: "Bound",               description: "Policy bound — complete",                   color: "bg-emerald-500/15 text-emerald-200", badgeClass: "bg-emerald-500/25",   order: 6, isTerminal: true,  isPgiDriven: true  },
  { id: "declined",          label: "Declined",            description: "PGI declined — terminal",                   color: "bg-rose-500/15 text-rose-200",       badgeClass: "bg-rose-500/25",      order: 7, isTerminal: true,  isPgiDriven: true  },
  { id: "claim",             label: "Claim",               description: "Active claim",                              color: "bg-orange-500/15 text-orange-200",   badgeClass: "bg-orange-500/25",    order: 8, isTerminal: false, isPgiDriven: true  },
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
  under_review:      ["documents_pending", "submitted"],
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
