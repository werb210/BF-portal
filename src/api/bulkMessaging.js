let emailCampaigns = [
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
let smsCampaigns = [
    {
        id: "sms-1",
        body: "Your application is almost done. Finish here: https://app.ly/finish",
        audience: { applicationStage: "started", retargetingListIds: ["aud-1"] },
        status: "sent",
        metrics: { delivered: 600, failed: 20, replies: 45 }
    }
];
const withDelay = async (data) => new Promise((resolve) => setTimeout(() => resolve(data), 100));
export const fetchEmailCampaigns = async () => withDelay(emailCampaigns);
export const fetchSmsCampaigns = async () => withDelay(smsCampaigns);
export const sendBulkEmail = async (payload) => {
    const created = {
        ...payload,
        id: `email-${emailCampaigns.length + 1}`,
        status: "sent",
        metrics: { delivered: 0, opens: 0, clicks: 0, replies: 0 }
    };
    emailCampaigns = [created, ...emailCampaigns];
    return withDelay(created);
};
export const sendBulkSms = async (payload) => {
    const created = {
        ...payload,
        id: `sms-${smsCampaigns.length + 1}`,
        status: "sent",
        metrics: { delivered: 0, failed: 0, replies: 0 }
    };
    smsCampaigns = [created, ...smsCampaigns];
    return withDelay(created);
};
