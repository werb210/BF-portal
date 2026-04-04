const DEFAULT_TITLES = {
    auth_alert: "Login alert",
    document_requested: "Document requested",
    lender_status: "Lender status update",
    system_alert: "System alert"
};
const DEFAULT_MESSAGES = {
    auth_alert: "We noticed a login or OTP event on your account.",
    document_requested: "A new document was requested.",
    lender_status: "A lender status changed.",
    system_alert: "Important system update available."
};
const ensureNotificationType = (type) => {
    if (type === "auth_alert" || type === "document_requested" || type === "lender_status" || type === "system_alert") {
        return type;
    }
    return "system_alert";
};
const createId = () => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID();
    }
    return `notif-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};
export const buildNotification = (payload, source) => {
    const type = ensureNotificationType(payload.type);
    const title = payload.title?.trim() || DEFAULT_TITLES[type];
    const message = payload.body?.trim() || DEFAULT_MESSAGES[type];
    return {
        id: createId(),
        type,
        title,
        message,
        createdAt: payload.createdAt ?? Date.now(),
        read: false,
        url: payload.url,
        source
    };
};
export const getNotificationLabel = (type) => DEFAULT_TITLES[type];
