import { api } from "@/utils/api";
export const getOffers = (appId) => api(`/api/offers/${appId}`);
export const fetchOffers = (applicationId, options) => api(`/api/offers/${applicationId}`, { signal: options?.signal });
export function uploadOffer(payload) {
    return api("/api/offers", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}
export const archiveOffer = (id) => api(`/api/offers/${id}`, {
    method: "DELETE",
});
