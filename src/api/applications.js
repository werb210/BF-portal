import { api } from "@/utils/api";
const withParams = (url, params) => {
    if (!params)
        return url;
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            searchParams.set(key, String(value));
        }
    });
    const query = searchParams.toString();
    return query ? `${url}?${query}` : url;
};
export const getApplications = () => api("/api/applications");
export const sendToLender = (id, lenders) => api(`/api/applications/${id}/send`, {
    method: "POST",
    body: { lenders },
});
export const createApplication = (payload) => api("/api/applications", {
    method: "POST",
    body: payload,
});
export function fetchPortalApplication(id, options) {
    const requestUrl = withParams(`/api/applications/${id}`, options?.params);
    return api(requestUrl, { signal: options?.signal });
}
export function updatePortalApplication(id, payload) {
    return api(`/api/applications/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
    });
}
export function fetchApplicationDetails(id, options) {
    const requestUrl = withParams(`/api/applications/${id}/details`, options?.params);
    return api(requestUrl, { signal: options?.signal });
}
export function fetchApplicationAudit(id, options) {
    const requestUrl = withParams(`/api/applications/${id}/audit`, options?.params);
    return api(requestUrl, { signal: options?.signal });
}
export const openPortalApplication = (id) => api(`/api/applications/${id}/open`, {
    method: "POST",
});
