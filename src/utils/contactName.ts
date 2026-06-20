// BF_PORTAL_CONTACT_NAME_v1 — resolve a human-friendly display name. Legacy imports sometimes put
// a phone number, a UUID, or the literal "None" in the name slot; prefer a real company/email/phone
// over those, falling back to "Unknown contact".
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BAD = new Set(["", "none", "null", "undefined", "unknown"]);
const PHONE_RE = /^[+(]?[\d().\s-]{7,}$/;

export function contactDisplayName(
  name: string | null | undefined,
  opts: { company?: string | null; email?: string | null; phone?: string | null } = {},
): string {
  const n = String(name ?? "").trim();
  const better = (opts.company ?? "").trim() || (opts.email ?? "").trim();
  const looksBad = !n || BAD.has(n.toLowerCase()) || UUID_RE.test(n);
  const looksPhone = PHONE_RE.test(n) && n.replace(/\D/g, "").length >= 7;
  if (looksBad) return better || (opts.phone ?? "").trim() || "Unknown contact";
  if (looksPhone && better) return better;
  return n;
}
