import { logger } from "@/utils/logger";
const RELOAD_GUARD_KEY = "portal:reload-guard";
const RELOAD_GUARD_TTL_MS = 30000;
const readGuardTimestamp = () => {
    if (typeof window === "undefined")
        return null;
    const raw = window.sessionStorage.getItem(RELOAD_GUARD_KEY);
    if (!raw)
        return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
};
export const clearReloadGuardIfStale = (ttlMs = RELOAD_GUARD_TTL_MS) => {
    if (typeof window === "undefined")
        return;
    const timestamp = readGuardTimestamp();
    if (timestamp === null)
        return;
    if (Date.now() - timestamp > ttlMs) {
        window.sessionStorage.removeItem(RELOAD_GUARD_KEY);
    }
};
export const triggerSafeReload = (reason, ttlMs = RELOAD_GUARD_TTL_MS) => {
    if (typeof window === "undefined")
        return;
    const timestamp = readGuardTimestamp();
    if (timestamp !== null && Date.now() - timestamp < ttlMs) {
        logger.warn("Reload suppressed to prevent loops.", { reason });
        return;
    }
    window.sessionStorage.setItem(RELOAD_GUARD_KEY, `${Date.now()}`);
    window.location.reload();
};
