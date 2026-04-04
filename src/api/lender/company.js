import { lenderApiClient } from "@/api";
export const fetchLenderCompany = () => lenderApiClient.get(`/lender/company`);
export const updateLenderCompany = (payload) => lenderApiClient.patch(`/lender/company`, payload);
export const uploadLenderLogo = (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return lenderApiClient.post(`/lender/company/logo`, formData);
};
