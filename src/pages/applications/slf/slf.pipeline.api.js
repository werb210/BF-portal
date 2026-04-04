import { api } from "@/api";
const API_PREFIX = "";
export const slfPipelineApi = {
    fetchColumn: async (stage, options) => {
        const res = await api.getList(`${API_PREFIX}/slf/applications?stage=${stage}`, options);
        return res;
    },
    moveCard: async (applicationId, newStage) => {
        return api.patch(`${API_PREFIX}/slf/applications/${applicationId}/status`, { status: newStage });
    },
    fetchSummary: async (applicationId) => {
        return api.get(`${API_PREFIX}/slf/applications/${applicationId}/summary`);
    }
};
