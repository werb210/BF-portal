// BF_PORTAL_v869_SETTINGS_PACK_SECURITY - the api client calls this on every error: a 403 STRONG_SIGN_IN_REQUIRED opens
// the "one more step" screen (StrongSignInGate). Kept free of imports so the api client has no cycle.
export const STRONG_EVENT = "ks:strong-sign-in-required";

export function reportStrongSignInRequired(status: number, details: unknown): void {
  if (status !== 403 || (details as { error?: string } | null)?.error !== "STRONG_SIGN_IN_REQUIRED") return;
  try { window.dispatchEvent(new CustomEvent(STRONG_EVENT)); } catch { /* no window */ }
}
