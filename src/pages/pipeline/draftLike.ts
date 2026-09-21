// BF_PORTAL_WIDGET_LIVE_COUNTS_v365 - moved unchanged from PipelinePage so the board
// and the home-screen widget share one rule for which applications count.
export type DraftLikeCard = {
  business_legal_name?: string | null;
  name?: string | null;
  submitted_at?: string | null;
  pipeline_state?: string | null;
  created_at?: string | null;
};

export function isDraftLikeApplication(card: DraftLikeCard): boolean {
  if (!card) return false;
  // BF_PORTAL_UNNAMED_JUNK_UNLESS_SUBMITTED_v1 - refinement of the
  // SUBMITTED_EXEMPT rule, which keyed on "real stage" and accidentally
  // surfaced 60+ junk unnamed drafts sitting in Received. The correct
  // discriminator is submitted_at (now on the card payload): an unnamed /
  // placeholder-named card is junk unless the application was actually
  // submitted. Bismillah Grocers (submitted, placeholder name) stays visible.
  const name = String(card.business_legal_name ?? card.name ?? "").trim().toLowerCase();
  const isSubmitted = Boolean(card.submitted_at);
  if (!name || name === "draft" || name === "draft application" || name === "unnamed application") {
    return !isSubmitted;
  }
  const state = String(card.pipeline_state ?? "").toLowerCase();
  const dateMs = new Date(card.created_at ?? "").getTime();
  const invalidDate = Number.isNaN(dateMs);
  return invalidDate && (state === "received" || state === "draft" || state === "new");
}
