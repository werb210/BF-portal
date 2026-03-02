export function resolvePostLoginDestination(role: string): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "staff":
      return "/dashboard";
    case "lender":
      return "/lenders";
    case "referrer":
      return "/referrals";
    default:
      throw new Error("Unknown role");
  }
}
