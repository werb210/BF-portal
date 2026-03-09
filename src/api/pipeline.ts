import { apiClient } from "@/lib/apiClient";

export async function updatePipelineStage(applicationId: string, stage: string) {
  return apiClient.patch(`/api/pipeline/${applicationId}/stage`, { stage });
}

