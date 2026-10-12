// BF_PORTAL_O365_SCOPES_v275
// The Microsoft scopes the portal asks for come from the VITE_MSAL_SCOPES
// build secret, and the code default is only used when that secret is empty.
// A secret without offline_access gives no refresh token, so Office 365 silently
// stops after an hour. The scopes every signed-in user needs are always included.
//
// BF_PORTAL_v789_INCREMENTAL_CONSENT - sign-in no longer asks for the broad mailbox and OneDrive
// permissions. Mail.ReadWrite and Files.ReadWrite are requested only when a feature that needs them is
// used (the inbox, saving to OneDrive, the library, a contact's OneDrive folder); see ensureO365Scopes()
// in auth/msal.ts and withO365Scopes() in api/o365Interceptor.ts.
export const SIGN_IN_O365_SCOPES = [
  "User.Read",
  "Mail.Send",
  "Calendars.ReadWrite",
  "Tasks.ReadWrite",
  "offline_access",
] as const;

/** Requested at the moment the inbox (read, move, delete mail) is used. */
export const MAIL_READWRITE_SCOPES = ["Mail.ReadWrite"] as const;
/** Requested at the moment a OneDrive feature is used. */
export const FILES_READWRITE_SCOPES = ["Files.ReadWrite"] as const; // BF_PORTAL_ONEDRIVE_ATTACHMENTS_v648

export const INCREMENTAL_O365_SCOPES: readonly string[] = [...MAIL_READWRITE_SCOPES, ...FILES_READWRITE_SCOPES];

const lower = (s: string) => s.toLowerCase();

/** VITE_MSAL_SCOPES plus the sign-in essentials, without the scopes that are requested incrementally. */
export function signInO365Scopes(configured: string | null | undefined): string[] {
  const later = new Set(INCREMENTAL_O365_SCOPES.map(lower));
  const list = String(configured ?? "")
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter((s) => s && !later.has(lower(s)));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const scope of [...list, ...SIGN_IN_O365_SCOPES]) {
    if (seen.has(lower(scope))) continue;
    seen.add(lower(scope));
    out.push(scope);
  }
  return out;
}

/** Sign-in scopes plus the extra ones a feature needs. */
export function featureO365Scopes(configured: string | null | undefined, extra: readonly string[]): string[] {
  const out = signInO365Scopes(configured);
  const seen = new Set(out.map(lower));
  for (const s of extra) if (!seen.has(lower(s))) { seen.add(lower(s)); out.push(s); }
  return out;
}

/** True when a failed request means the user has not granted the permission a feature needs. */
export function isO365ConsentError(error: unknown): boolean {
  const e = error as { status?: number; code?: unknown; message?: unknown; details?: { error?: unknown; code?: unknown } } | null;
  const status = e?.status;
  const text = [e?.code, e?.details?.error, e?.details?.code, e?.message].map((v) => String(v ?? "")).join(" ");
  return status === 412 || /permission_needed|consent_required|insufficient_scope|scope_missing|Reconnect Microsoft 365/i.test(text);
}

/** The server's plain-English reason (BF-Server v274) from a failed request, if any. */
export function o365ReasonFrom(error: unknown): string | null {
  const details = (error as { details?: { reason?: unknown } } | null)?.details;
  return typeof details?.reason === "string" && details.reason.trim() ? details.reason : null;
}
