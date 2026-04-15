export type Role = "Admin" | "Staff" | "Ops" | "Lender" | "Referrer";

const ROLE_LOOKUP: Record<string, Role> = {
  admin: "Admin",
  staff: "Staff",
  ops: "Ops",
  lender: "Lender",
  referrer: "Referrer",
};

export function normalizeRole(input: unknown): Role | null {
  if (typeof input !== "string") return null;
  const normalized = input.trim().toLowerCase();
  return ROLE_LOOKUP[normalized] ?? null;
}

export function roleIn(role: Role | null, allowed: Role[]): boolean {
  return Boolean(role && allowed.includes(role));
}
