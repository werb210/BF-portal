import api from "@/api";
export async function updatePipelineStage(applicationId, stage) {
    return api.patch(`/applications/${applicationId}/status`, { stage });
}
