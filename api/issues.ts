export async function disabledFeature() {
  return null;
}

export type WebsiteIssue = {
  id: string;
  message: string;
  screenshotUrl?: string;
  screenshot?: string;
  createdAt?: string;
  resolved?: boolean;
  sessionId?: string;
};

export const resolveIssue = disabledFeature;
export const deleteIssue = disabledFeature;
export const fetchWebsiteIssues = disabledFeature;
