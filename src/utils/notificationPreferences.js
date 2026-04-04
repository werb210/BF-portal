const buildKey = (userId) => `staff-portal:push-permission:${userId ?? "anonymous"}`;
const defaultPreference = () => ({
    status: "default",
    prompted: false,
    updatedAt: Date.now()
});
export const readPushPreference = (userId) => {
    if (typeof window === "undefined")
        return defaultPreference();
    const key = buildKey(userId);
    const raw = window.sessionStorage.getItem(key);
    if (!raw)
        return defaultPreference();
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed.status !== "string")
            return defaultPreference();
        return {
            status: parsed.status,
            prompted: Boolean(parsed.prompted),
            updatedAt: Number(parsed.updatedAt) || Date.now()
        };
    }
    catch {
        return defaultPreference();
    }
};
export const writePushPreference = (userId, preference) => {
    if (typeof window === "undefined")
        return;
    const key = buildKey(userId);
    window.sessionStorage.setItem(key, JSON.stringify(preference));
};
