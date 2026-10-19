// BF_PORTAL_v828_PARTNER_STAGE_TRACKER - the pipeline stage follow-along a lender, broker or referrer sees for each
// file they sent: Received -> In Review -> Documents -> Submitted to lenders -> Offer -> Funded, or Closed / Not
// accepted. Stage names only: never which lenders, never the offers.
import "./partnerPortal.css";

export const TRACKER_STEPS = ["Received", "In Review", "Documents", "Submitted to lenders", "Offer", "Funded"] as const;

export type TrackerInput = {
  /** applications.pipeline_state, any casing ("Off to Lender", "off_to_lender", "draft"). */
  stage?: string | null;
  /** Before the file is a working application: Boreal reviewing it, it was not accepted, or it could not be read. */
  hold?: "under_review" | "not_accepted" | "waiting_client" | "unreadable" | null;
};

export type TrackerPosition = { index: number; closed: boolean; status: string };

const STEP_OF: Record<string, number> = {
  draft: 0, received: 0, new: 0,
  in_review: 1, hold: 1, fraud: 1,
  documents_required: 2, additional_steps_required: 2, requires_docs: 2,
  off_to_lender: 3, submitted: 3, submitted_to_lenders: 3,
  offer: 4, approved: 4,
  accepted: 5, funded: 5,
};
const CLOSED = new Set(["rejected", "declined", "closed", "withdrawn", "lost", "cancelled", "canceled"]);

/** Where a file sits on the tracker, and the one-line status under it. */
export function trackerPosition(input: TrackerInput): TrackerPosition {
  if (input.hold === "not_accepted") return { index: -1, closed: true, status: "Not accepted - Boreal could not take this file" };
  if (input.hold === "unreadable") return { index: 0, closed: false, status: "Received - Boreal is checking the upload" };
  if (input.hold === "under_review") return { index: 0, closed: false, status: "Received - Boreal is reviewing the file" };
  const key = String(input.stage ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (CLOSED.has(key)) return { index: -1, closed: true, status: "Closed" };
  const index = STEP_OF[key] ?? 0;
  if (index === 0 && (input.hold === "waiting_client" || key === "draft" || key === "")) {
    return { index: 0, closed: false, status: "Received - waiting for the client to sign in" };
  }
  if (index === 5) return { index, closed: false, status: "Funded" };
  return { index, closed: false, status: TRACKER_STEPS[index] ?? "Received" };
}

export default function StageTracker({ stage, hold, compact = false, label }: TrackerInput & { compact?: boolean; label?: string }) {
  const pos = trackerPosition({ stage, hold });
  return (
    <div className={`pp-tracker${pos.closed ? " pp-tracker--closed" : ""}${compact ? " pp-tracker--compact" : ""}`} data-testid="stage-tracker">
      <ol className="pp-tracker__steps" aria-label={label ?? "Stage"}>
        {TRACKER_STEPS.map((name, i) => {
          const state = pos.closed ? "" : i < pos.index || (i === pos.index && pos.index === 5) ? " pp-tracker__step--done" : i === pos.index ? " pp-tracker__step--current" : "";
          return (
            <li key={name} className={`pp-tracker__step${state}`} aria-current={!pos.closed && i === pos.index ? "step" : undefined}>
              <span className="pp-tracker__bar" aria-hidden="true" />
              <span className="pp-tracker__label">{name}</span>
            </li>
          );
        })}
      </ol>
      <div className={`pp-tracker__status${pos.closed ? " pp-tracker__status--closed" : ""}`} data-testid="stage-status">{pos.closed || pos.status.includes(" - ") ? pos.status : `Current stage: ${pos.status}`}</div>
    </div>
  );
}
