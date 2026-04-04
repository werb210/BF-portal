export const isStandaloneDisplayMode = () => {
    if (typeof window === "undefined")
        return false;
    return (window.matchMedia?.("(display-mode: standalone)").matches ||
        navigator.standalone === true);
};
export const getDisplayMode = () => (isStandaloneDisplayMode() ? "standalone" : "browser");
