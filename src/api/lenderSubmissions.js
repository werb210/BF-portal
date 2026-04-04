import { api } from "@/api";
export const lenderSubmissionsApi = {
    send: (payload) => api.post("/api/lender-submissions", payload)
};
