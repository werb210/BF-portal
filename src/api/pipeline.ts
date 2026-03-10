import { apiClient } from "@/lib/apiClient";

export async function updatePipelineStage(applicationId: string, stage: string) {
  const response = await apiClient.patch(`/api/pipeline/${applicationId}/stage`, { stage });
  return response;
}
