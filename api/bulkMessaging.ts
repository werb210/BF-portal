export type AudienceFilter = {
  crmTags?: string[];
  silo?: string;
  owner?: string;
  applicationStage?: string;
  retargetingListIds?: string[];
};

export type BulkEmail = {
  id: string;
  subject: string;
  body: string;
  audience: AudienceFilter;
  template?: string;
  status: "draft" | "sending" | "sent";
  metrics: { delivered: number; opens: number; clicks: number; replies: number };
};

export type BulkSMS = {
  id: string;
  body: string;
  audience: AudienceFilter;
  status: "draft" | "sending" | "sent";
  metrics: { delivered: number; failed: number; replies: number };
};

let emailCampaigns: BulkEmail[] = [
  {
    id: "email-1",
    subject: "Spring funding for SMBs",
    body: "<p>Apply now for better rates.</p>",
    audience: { crmTags: ["SMB"], silo: "BF" },
    template: "Q2-offer",
    status: "sent",
    metrics: { delivered: 1800, opens: 1200, clicks: 420, replies: 38 }
  }
];

let smsCampaigns: BulkSMS[] = [
  {
    id: "sms-1",
    body: "Your application is almost done. Finish here: https://app.ly/finish",
    audience: { applicationStage: "started", retargetingListIds: ["aud-1"] },
    status: "sent",
    metrics: { delivered: 600, failed: 20, replies: 45 }
  }
];

const withDelay = async <T,>(data: T) => new Promise<T>((resolve) => setTimeout(() => resolve(data), 100));

export const fetchEmailCampaigns = async (): Promise<BulkEmail[]> => withDelay(emailCampaigns);

export const fetchSmsCampaigns = async (): Promise<BulkSMS[]> => withDelay(smsCampaigns);

export const sendBulkEmail = async (payload: Omit<BulkEmail, "id" | "status" | "metrics">): Promise<BulkEmail> => {
  const created: BulkEmail = {
    ...payload,
    id: `email-${emailCampaigns.length + 1}`,
    status: "sent",
    metrics: { delivered: 0, opens: 0, clicks: 0, replies: 0 }
  };
  emailCampaigns = [created, ...emailCampaigns];
  return withDelay(created);
};

export const sendBulkSms = async (payload: Omit<BulkSMS, "id" | "status" | "metrics">): Promise<BulkSMS> => {
  const created: BulkSMS = {
    ...payload,
    id: `sms-${smsCampaigns.length + 1}`,
    status: "sent",
    metrics: { delivered: 0, failed: 0, replies: 0 }
  };
  smsCampaigns = [created, ...smsCampaigns];
  return withDelay(created);
};
