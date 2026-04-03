// @ts-nocheck
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

export const resolveIssue = async (_id: string) => ({ success: true });
export const deleteIssue = async (_id: string) => ({ success: true });
export const fetchWebsiteIssues = async (): Promise<WebsiteIssue[]> => [];
