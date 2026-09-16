// BF_PORTAL_O365_SCOPES_v275
// The Microsoft scopes the portal asks for come from the VITE_MSAL_SCOPES
// build secret, and the code default is only used when that secret is empty.
// A secret without Mail.ReadWrite gives a token that cannot read mail, and one
// without offline_access gives no refresh token, so Office 365 silently stops
// after an hour. The scopes the portal needs are now always included.
export const REQUIRED_O365_SCOPES = [
  "User.Read",
  "Mail.Send",
  "Mail.ReadWrite",
  "Calendars.ReadWrite",
  "Tasks.ReadWrite",
  "offline_access",
] as const;

export function withRequiredO365Scopes(configured: string | null | undefined): string[] {
  const list = String(configured ?? "").split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);
  const seen = new Set(list.map((s) => s.toLowerCase()));
  for (const scope of REQUIRED_O365_SCOPES) {
    if (!seen.has(scope.toLowerCase())) {
      list.push(scope);
      seen.add(scope.toLowerCase());
    }
  }
  return list;
}

/** The server's plain-English reason (BF-Server v274) from a failed request, if any. */
export function o365ReasonFrom(error: unknown): string | null {
  const details = (error as { details?: { reason?: unknown } } | null)?.details;
  return typeof details?.reason === "string" && details.reason.trim() ? details.reason : null;
}
