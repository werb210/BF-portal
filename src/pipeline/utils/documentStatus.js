export function applicationNeedsDocs(docs) {
    if (!docs || docs.length === 0) {
        return true;
    }
    for (const doc of docs) {
        if (doc.status === "rejected") {
            return true;
        }
    }
    return false;
}
