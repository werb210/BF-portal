const pendingRequests = new Map();
const createPendingId = () => `pending_${Math.random().toString(36).slice(2, 10)}`;
const buildRequestUrl = (config) => {
    const base = config.baseURL ?? "";
    const url = config.url ?? "";
    if (!base)
        return url;
    if (!url)
        return base;
    if (base.endsWith("/") && url.startsWith("/")) {
        return `${base}${url.slice(1)}`;
    }
    if (!base.endsWith("/") && !url.startsWith("/")) {
        return `${base}/${url}`;
    }
    return `${base}${url}`;
};
export const startPendingRequest = (config) => {
    const id = createPendingId();
    pendingRequests.set(id, {
        id,
        method: config.method?.toUpperCase(),
        url: buildRequestUrl(config),
        startedAt: Date.now()
    });
    return id;
};
export const endPendingRequest = (id) => {
    if (!id)
        return;
    pendingRequests.delete(id);
};
export const getPendingRequests = () => Array.from(pendingRequests.values());
