import { api, rawApiFetch } from "@/api";
export const slfPipelineAdapter = {
    fetchPipeline: (filters) => api("/api/slf/pipeline", {
        method: "POST",
        body: filters ?? {},
    }),
    updateStage: async (applicationId, stage) => {
        await api(`/api/slf/pipeline/${applicationId}/stage`, {
            method: "PATCH",
            body: { stage },
        });
    },
    exportApplications: async (ids) => {
        const response = await rawApiFetch("/api/slf/pipeline/export", {
            method: "POST",
            credentials: "include",
            body: JSON.stringify({ ids })
        });
        return response.blob();
    },
};
