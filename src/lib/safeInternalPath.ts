// BF_PORTAL_NAV_GUARD_v1 - navigation targets that do not come from a literal in
// the source (server notification links, Maya command actions) are normalised
// here first. Anything that could leave the portal origin is rejected outright,
// which closes the open-redirect class regardless of the router version.
export function safeInternalPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw.startsWith("/")) return null;
  if (raw.startsWith("//")) return null;
  if (raw.includes("\\")) return null;
  if (/[\u0000-\u001f\u007f]/.test(raw)) return null;
  return raw;
}
