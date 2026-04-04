export const roleValues = ["Admin", "Staff", "Marketing", "Viewer", "Lender", "Referrer"];
export const fullStaffRoles = ["Admin", "Staff", "Marketing"];
export const canAccessMarketing = (role) => role === "Admin";
export const canAccessStaffPortal = (role) => role != null && fullStaffRoles.includes(role);
export const canAccessLenderPortal = (role) => role === "Lender";
export const canAccessReferrerPortal = (role) => role === "Referrer";
export const hasRequiredRole = (role, requiredRoles) => Boolean(role && requiredRoles.includes(role));
export const isUserRole = (role) => roleValues.includes(role);
export const resolveUserRole = (role) => typeof role === "string" && isUserRole(role) ? role : null;
export const assertKnownRole = (role) => {
    if (!isUserRole(role)) {
        throw new Error(`Invalid role: ${role}`);
    }
};
export const getRoleLabel = (role) => {
    switch (role) {
        case "Admin":
            return "Admin";
        case "Staff":
            return "Staff";
        case "Marketing":
            return "Marketing";
        case "Viewer":
            return "Viewer";
        case "Lender":
            return "Lender";
        case "Referrer":
            return "Referrer";
        default:
            return "Unassigned";
    }
};
