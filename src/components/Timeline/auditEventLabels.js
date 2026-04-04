const normalize = (value) => value.toLowerCase();
export const getAuditEventLabel = (event) => {
    const type = event.type?.trim();
    if (!type)
        return "";
    const normalized = normalize(type);
    if (normalized.includes("submission") && normalized.includes("google") && normalized.includes("sheet")) {
        return "Application submitted to lender (Google Sheet)";
    }
    if (normalized.includes("submission") && normalized.includes("failed")) {
        return "Submission failed — retry required";
    }
    if (normalized.includes("submission") && (normalized.includes("retried") || normalized.includes("retry"))) {
        return "Submission retried successfully";
    }
    return type;
};
