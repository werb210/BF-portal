export function requireRole(user, roles) {
    const userRole = user?.role;
    if (!userRole || !roles.some((role) => role === userRole)) {
        return false;
    }
    return true;
}
