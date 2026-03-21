import { apiFetch } from "@api/client";

export async function updatePipelineStage(applicationId: string, stage: string) {
  return apiFetch(`/portal/applications/${applicationId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ stage }),
  });
}
