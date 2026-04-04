let cache = {};
export function syncRequiredDocumentsFromStatus(status) {
    const docs = new Set();
    if (status?.requiredDocs) {
        status.requiredDocs.forEach((d) => docs.add(d));
    }
    docs.add("bank_statements");
    cache = { default: Array.from(docs) };
    return cache;
}
export function getRequiredDocs() {
    return cache;
}
