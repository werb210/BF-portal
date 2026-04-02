import api from "@/api";

export async function updatePipelineStage(applicationId: string, stage: string) {
  return api.patch(`/applications/${applicationId}/status`, { stage });
}
