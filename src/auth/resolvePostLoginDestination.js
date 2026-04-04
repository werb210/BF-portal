export function resolvePostLoginDestination(role) {
    switch (role) {
        case "admin":
            return "/portal";
        case "staff":
            return "/portal";
        case "lender":
            return "/lenders";
        case "referrer":
            return "/referrals";
        default:
            throw new Error("Unknown role");
    }
}
