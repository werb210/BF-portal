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
  void id;
  return null;
}

export async function deleteIssue(id: string) {
  void id;
}

export async function fetchWebsiteIssues() {
  return [];
}
