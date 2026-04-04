const STORAGE_KEY = "portal.application.draft";
export const readPortalDraft = () => {
    if (typeof window === "undefined")
        return {};
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw)
        return {};
    try {
        return JSON.parse(raw);
    }
    catch {
        return {};
    }
};
const writePortalDraft = (draft) => {
    if (typeof window === "undefined")
        return;
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
};
export const updatePortalDraft = (updates) => {
    const next = { ...readPortalDraft(), ...updates };
    writePortalDraft(next);
    return next;
};
export const clearPortalDraft = () => {
    if (typeof window === "undefined")
        return;
    window.sessionStorage.removeItem(STORAGE_KEY);
};
