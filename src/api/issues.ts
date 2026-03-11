import { apiClient } from "@/api/httpClient";
import { withApiBase } from "@/lib/apiBase";

export type WebsiteIssue = {
  id: string;
  message: string;
  screenshotUrl?: string;
  screenshot?: string;
  createdAt?: string;
  resolved?: boolean;
  sessionId?: string;
};

export async function resolveIssue(id: string) {
  return apiClient.patch(`/support/issues/${id}/resolve`);
}

export async function deleteIssue(id: string) {
  await fetch(withApiBase(`/api/support/issues/${id}`), {
    method: "DELETE"
  });
}

export async function fetchWebsiteIssues() {
  const data = await apiClient.get<WebsiteIssue[] | { issues?: WebsiteIssue[] }>("/support/issues");
  return Array.isArray(data) ? data : (data.issues ?? []);
}
