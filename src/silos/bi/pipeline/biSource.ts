// BF_PORTAL_BI_SOURCE_LABEL_v392 - a BF referral (BI source 'bf_pgi_referral',
// source_type 'public') was labelled "Public application"/"Public", the same as
// someone who applied on boreal.insure. Name where each application came from.
export type BiSourceFields = {
  source?: string | null;
  source_type?: string | null;
  lender_name?: string | null;
  bf_application_id?: string | null;
};

export function isBfReferral(app: BiSourceFields): boolean {
  return app.source === "bf_pgi_referral" || Boolean(app.bf_application_id);
}

/** Full label for the application page. */
export function biSourceLabel(app: BiSourceFields): string {
  const kind = app.source_type ?? app.source;
  if (kind === "lender") return `Lender-submitted${app.lender_name ? ` (${app.lender_name})` : ""}`;
  if (kind === "referrer") return "Referrer-submitted";
  if (isBfReferral(app)) return "Boreal Financial referral";
  return "Website application";
}

/** Short label for pipeline cards. */
export function biSourceShort(app: BiSourceFields): string {
  const kind = app.source_type ?? app.source;
  if (kind === "lender") return `Lender${app.lender_name ? ` (${app.lender_name})` : ""}`;
  if (kind === "referrer") return "Referrer";
  if (isBfReferral(app)) return "BF referral";
  return "Website";
}
