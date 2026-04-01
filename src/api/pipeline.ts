import api from "@/lib/apiClient";

export async function updatePipelineStage(applicationId: string, stage: string) {
  return api.patch(`/applications/${applicationId}/status`, { stage });
}
