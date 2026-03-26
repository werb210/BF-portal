import { apiFetch } from "@api/client";

export async function updatePipelineStage(applicationId: string, stage: string) {
  return apiFetch(`/applications/${applicationId}/status`, {
    method: "PATCH",
    body: { stage },
  });
}
