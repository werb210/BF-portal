import { api, rawApiFetch } from "@/api";
export const biPipelineAdapter = {
    fetchPipeline: (filters) => api("/api/bi/pipeline", {
        method: "POST",
        body: filters ?? {},
    }),
    updateStage: async (applicationId, stage) => {
        await api(`/api/bi/pipeline/${applicationId}/stage`, {
            method: "PATCH",
            body: { stage },
        });
    },
    exportApplications: async (ids) => {
        const response = await rawApiFetch("/api/bi/pipeline/export", {
            method: "POST",
            credentials: "include",
            body: JSON.stringify({ ids })
        });
        return response.blob();
    },
};
