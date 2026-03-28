import Card from "@/components/ui/Card";
import Table from "@/components/ui/Table";
import AppLoading from "@/components/layout/AppLoading";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { fetchAttributionDashboard, type AttributionDashboard as AttributionDashboardData } from "@/api/marketing.attribution";
import { fetchAds, type AdRecord } from "@/api/marketing.ads";
import { fetchAssets, type BrandAsset } from "@/api/marketing.assets";
import { useMarketingStore } from "@/state/marketing.store";
import AdsList from "./AdsManager/AdsList";
import ABTestingSuite from "./AdsManager/ABTestingSuite";
import CampaignList from "./Campaigns/CampaignList";
import CampaignAnalytics from "./Campaigns/CampaignAnalytics";
import BulkEmailComposer from "./BulkMessaging/BulkEmailComposer";
import BulkSMSComposer from "./BulkMessaging/BulkSMSComposer";
import AttributionDashboard from "./Attribution/AttributionDashboard";
import RetargetingRules from "./Retargeting/RetargetingRules";
import RetargetingAudienceList from "./Retargeting/RetargetingAudienceList";
import BrandLibrary from "./Assets/BrandLibrary";
import MarketingToDoList from "./ToDo/MarketingToDoList";
import { getErrorMessage } from "@/utils/errors";
import { getRequestId } from "@/utils/requestId";
import { emitUiTelemetry } from "@/utils/uiTelemetry";
import { logger } from "@/utils/logger";

const MarketingDashboard = () => {
  const { dateRange } = useMarketingStore();
  const { data: attribution, isLoading: loadingAttribution, error: attributionError } = useQuery<AttributionDashboardData, Error>({
    queryKey: ["attribution", dateRange],
    queryFn: () => fetchAttributionDashboard(dateRange)
  });
  const { data: ads, error: adsError, isLoading: loadingAds } = useQuery<AdRecord[], Error>({
    queryKey: ["ads-dashboard"],
    queryFn: fetchAds
  });
  const { data: assets, error: assetsError } = useQuery<BrandAsset[], Error>({
    queryKey: ["assets"],
    queryFn: fetchAssets
  });

  useEffect(() => {
    if (attributionError) {
      logger.error("Failed to load attribution", { requestId: getRequestId(), error: attributionError });
    }
  }, [attributionError]);

  useEffect(() => {
    if (adsError) {
      logger.error("Failed to load ads", { requestId: getRequestId(), error: adsError });
    }
  }, [adsError]);

  useEffect(() => {
    if (assetsError) {
      logger.error("Failed to load assets", { requestId: getRequestId(), error: assetsError });
    }
  }, [assetsError]);

  useEffect(() => {
    if (!loadingAttribution && !loadingAds && !adsError && !assetsError && !attributionError) {
      emitUiTelemetry("data_loaded", {
        view: "marketing",
        adsCount: ads?.length ?? 0,
        assetsCount: assets?.length ?? 0
      });
    }
  }, [ads?.length, adsError, assets?.length, assetsError, attributionError, loadingAds, loadingAttribution]);

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="AI Insights">
          <ul className="list-disc pl-5 space-y-2">
            <li>Increase Google Ads budget by $1,000 — funded-deal conversion trending 12%.</li>
            <li>Pause underperforming Meta ad creative — CPC is 35% higher than Google.</li>
            <li>Retarget unfinished applications with SMS to recover 180 leads.</li>
            <li>Create new ad for healthcare practices highlighting 24-hour approvals.</li>
          </ul>
        </Card>
        <Card title="Performance Snapshot">
          {adsError && <p className="text-red-700">{getErrorMessage(adsError, "Unable to load ads performance.")}</p>}
          {loadingAds && <AppLoading />}
          {!loadingAds && !adsError && (
            <Table headers={["Platform", "Spend", "Impr.", "Clicks", "Conv.", "CPQA"]}>
              {ads?.map((ad) => (
                <tr key={ad.id}>
                  <td>{ad.platform}</td>
                  <td>${ad.spend.toLocaleString()}</td>
                  <td>{ad.impressions.toLocaleString()}</td>
                  <td>{ad.clicks.toLocaleString()}</td>
                  <td>{ad.conversions.toLocaleString()}</td>
                  <td>
                    {ad.qualifiedApplications
                      ? `$${Math.round(ad.spend / ad.qualifiedApplications)}`
                      : "–"}
                  </td>
                </tr>
              ))}
              {!ads?.length && (
                <tr>
                  <td colSpan={6}>No ads data available yet.</td>
                </tr>
              )}
            </Table>
          )}
        </Card>
      </div>

      {attributionError && (
        <p className="text-red-700">{getErrorMessage(attributionError, "Unable to load attribution analytics.")}</p>
      )}
      <CampaignAnalytics />
      <CampaignList />
      <AdsList />
      <ABTestingSuite />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BulkEmailComposer />
        <BulkSMSComposer />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RetargetingRules />
        <RetargetingAudienceList />
      </div>

      <AttributionDashboard data={attribution} loading={loadingAttribution} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {assetsError && <p className="text-red-700">{getErrorMessage(assetsError, "Unable to load brand assets.")}</p>}
        <BrandLibrary assets={assets} />
        <MarketingToDoList />
      </div>
    </div>
  );
};

export default MarketingDashboard;
