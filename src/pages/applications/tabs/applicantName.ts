// BF_PORTAL_v851_APPLICANT_NAME - an application whose applicant is still the OTP placeholder
// ("Unknown (application started)") or has no name cannot be sent for signing: BF-Server answers
// 422 applicant_name_missing. The Application tab says so before staff press the button.

export const APPLICANT_NAME_MISSING_NOTE = "Applicant name missing - add it before sending for signing";

function clean(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

/** True for "Unknown", "(application started)" and "Unknown (application started)" (any case/spacing). */
export function isPlaceholderName(value: unknown): boolean {
  const s = clean(value).toLowerCase();
  if (!s) return false;
  if (s.includes("(application started)")) return true;
  return s === "unknown" || s === "unknown unknown";
}

function isRealName(value: unknown): boolean {
  return Boolean(clean(value)) && !isPlaceholderName(value);
}

/** True when none of the applicant blocks carries a real first, last or full name. */
export function applicantNameMissing(...sources: unknown[]): boolean {
  for (const src of sources) {
    if (!src || typeof src !== "object" || Array.isArray(src)) continue;
    const a = src as Record<string, unknown>;
    const fields = [a.firstName, a.first_name, a.lastName, a.last_name, a.fullName, a.full_name, a.name];
    if (fields.some(isRealName)) return false;
  }
  return true;
}

/** The server's "add the name first" refusal, from a thrown ApiError or an { ok:false, reason } answer. */
export function applicantNameMissingMessage(errOrData: unknown): string | null {
  if (!errOrData || typeof errOrData !== "object") return null;
  const e = errOrData as { code?: unknown; details?: unknown; reason?: unknown; error?: unknown; message?: unknown };
  const details = (e.details && typeof e.details === "object" ? e.details : {}) as { error?: unknown; message?: unknown };
  const hit = [e.code, e.reason, e.error, details.error].some((v) => v === "applicant_name_missing");
  if (!hit) return null;
  const msg = clean(details.message) || clean(e.message);
  return msg && msg !== "applicant_name_missing" ? msg : "Add the applicant's name first";
}
