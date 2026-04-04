import { lenderApiClient } from "@/api";
export const fetchLenderProducts = async () => {
    const res = await lenderApiClient.getList(`/lender/products`);
    return res;
};
export const createLenderProduct = (payload) => lenderApiClient.post(`/lender/products`, payload);
export const updateLenderProduct = (id, payload) => lenderApiClient.patch(`/lender/products/${id}`, payload);
export const deleteLenderProduct = (id) => lenderApiClient.delete(`/lender/products/${id}`);
export const uploadLenderApplicationForm = (id, file) => {
    const formData = new FormData();
    formData.append("file", file);
    return lenderApiClient.post(`/lender/products/${id}/application-form`, formData);
};
export const updateRequiredDocuments = (id, payload) => lenderApiClient.patch(`/lender/products/${id}/required-docs`, payload);
