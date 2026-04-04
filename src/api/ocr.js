import { api } from "@/api";
export const fetchOcrResults = (applicationId, options) => api.get(`/ocr/${applicationId}/results`, options);
