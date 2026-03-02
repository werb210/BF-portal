export type UserRole = "admin" | "staff" | "lender" | "referrer";

export function resolvePostLoginDestination(role: UserRole): string {
  switch (role) {
    case "admin":
    case "staff":
      return "/admin";
    case "lender":
      return "/lenders";
    case "referrer":
      return "/referrals";
    default:
      throw new Error("Unknown role");
  }
}
