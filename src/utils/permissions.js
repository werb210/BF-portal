import { hasRequiredRole } from "@/utils/roles";
export const hasCapabilities = (userCapabilities, requiredCapabilities) => {
    if (requiredCapabilities.length === 0)
        return true;
    if (!userCapabilities || userCapabilities.length === 0)
        return false;
    return requiredCapabilities.every((capability) => userCapabilities.includes(capability));
};
export const canAccess = (params) => {
    const { role, allowedRoles = [], requiredCapabilities = [], userCapabilities } = params;
    const roleAllowed = allowedRoles.length === 0 || hasRequiredRole(role, allowedRoles);
    const capabilityAllowed = hasCapabilities(userCapabilities, requiredCapabilities);
    return roleAllowed && capabilityAllowed;
};
export const canAccessLenderResource = (params) => {
    if (params.role === "Admin")
        return true;
    if (params.role !== "Lender")
        return false;
    if (!params.userLenderId || !params.resourceLenderId)
        return false;
    return params.userLenderId === params.resourceLenderId;
};
