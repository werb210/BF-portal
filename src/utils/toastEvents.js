const TOAST_EVENT = "portal:toast";
export function showToast(message, variant = "success") {
    window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: { message, variant } }));
}
export function subscribeToToasts(listener) {
    const handler = (event) => {
        const customEvent = event;
        listener(customEvent.detail.message, customEvent.detail.variant);
    };
    window.addEventListener(TOAST_EVENT, handler);
    return () => window.removeEventListener(TOAST_EVENT, handler);
}
