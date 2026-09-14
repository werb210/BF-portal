// BF_PORTAL_NEGATIVES_CAMPAIGN_PICKER_v177
// BF-Server /api/marketing/campaigns now returns the account's live campaigns
// (v176). Some BF-Server routes answer with an envelope and some do not, so
// unwrap either shape the way unwrapCandidates already does in this folder.
export type AdCampaign = { id: string; name: string; status: string; channel?: string };

export type CampaignsResponse =
  | { campaigns?: AdCampaign[]; configured?: boolean }
  | { data?: { campaigns?: AdCampaign[]; configured?: boolean } }
  | AdCampaign[];

export function unwrapCampaigns(response: CampaignsResponse | null | undefined): AdCampaign[] {
  if (Array.isArray(response)) return response.filter((c) => c && c.id);
  const envelope = (response as { data?: { campaigns?: AdCampaign[] } } | null)?.data;
  if (envelope && Array.isArray(envelope.campaigns)) return envelope.campaigns.filter((c) => c && c.id);
  const direct = (response as { campaigns?: AdCampaign[] } | null)?.campaigns;
  return Array.isArray(direct) ? direct.filter((c) => c && c.id) : [];
}

export function campaignLabel(campaign: AdCampaign): string {
  const paused = String(campaign.status ?? "").toUpperCase() === "PAUSED";
  return paused ? `${campaign.name} (paused)` : campaign.name;
}
