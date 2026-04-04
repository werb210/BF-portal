const ROLE_LOOKUP = {
    admin: "Admin",
    staff: "Staff",
    lender: "Lender",
    referrer: "Referrer",
    marketing: "Marketing"
};
export function normalizeRole(input) {
    if (typeof input !== "string")
        return null;
    const normalized = input.trim().toLowerCase();
    return ROLE_LOOKUP[normalized] ?? null;
}
export function roleIn(role, allowed) {
    return Boolean(role && allowed.includes(role));
}
