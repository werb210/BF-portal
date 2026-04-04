const roleCapabilities = {
    Admin: { canRead: true, canWrite: true, canOverride: true },
    Staff: { canRead: true, canWrite: true, canOverride: false },
    Marketing: { canRead: true, canWrite: true, canOverride: false },
    Viewer: { canRead: true, canWrite: false, canOverride: false },
    Lender: { canRead: false, canWrite: false, canOverride: false },
    Referrer: { canRead: false, canWrite: false, canOverride: false }
};
export const resolvePortalRole = (role) => {
    if (role === "Admin" ||
        role === "Staff" ||
        role === "Marketing" ||
        role === "Viewer" ||
        role === "Lender" ||
        role === "Referrer") {
        return role;
    }
    return "Viewer";
};
export const getPortalCapabilities = (role) => roleCapabilities[resolvePortalRole(role)];
export const canRead = (role) => getPortalCapabilities(role).canRead;
export const canWrite = (role) => getPortalCapabilities(role).canWrite;
export const canOverride = (role) => getPortalCapabilities(role).canOverride;
