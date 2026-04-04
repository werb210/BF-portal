export const SUBMISSION_METHOD_LABELS = {
    GOOGLE_SHEET: "Google Sheet",
    EMAIL: "Email",
    API: "API",
    MANUAL: "Manual"
};
export const getSubmissionMethodLabel = (method) => {
    if (!method)
        return "Manual";
    if (method in SUBMISSION_METHOD_LABELS) {
        return SUBMISSION_METHOD_LABELS[method];
    }
    return String(method);
};
export const getSubmissionMethodBadgeTone = (method) => {
    switch (method) {
        case "GOOGLE_SHEET":
            return "google-sheet";
        case "API":
            return "api";
        case "EMAIL":
            return "email";
        case "MANUAL":
            return "manual";
        default:
            return "manual";
    }
};
