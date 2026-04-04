import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Card from "@/components/ui/Card";
import Table from "@/components/ui/Table";
import AppLoading from "@/components/layout/AppLoading";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { fetchAttributionDashboard } from "@/api/marketing.attribution";
import { fetchAds } from "@/api/marketing.ads";
import { fetchAssets } from "@/api/marketing.assets";
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
    const { data: attribution, isLoading: loadingAttribution, error: attributionError } = useQuery({
        queryKey: ["attribution", dateRange],
        queryFn: () => fetchAttributionDashboard(dateRange)
    });
    const { data: ads, error: adsError, isLoading: loadingAds } = useQuery({
        queryKey: ["ads-dashboard"],
        queryFn: fetchAds
    });
    const { data: assets, error: assetsError } = useQuery({
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
    return (_jsxs("div", { className: "grid gap-4", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsx(Card, { title: "AI Insights", children: _jsxs("ul", { className: "list-disc pl-5 space-y-2", children: [_jsx("li", { children: "Increase Google Ads budget by $1,000 \u2014 funded-deal conversion trending 12%." }), _jsx("li", { children: "Pause underperforming Meta ad creative \u2014 CPC is 35% higher than Google." }), _jsx("li", { children: "Retarget unfinished applications with SMS to recover 180 leads." }), _jsx("li", { children: "Create new ad for healthcare practices highlighting 24-hour approvals." })] }) }), _jsxs(Card, { title: "Performance Snapshot", children: [adsError && _jsx("p", { className: "text-red-700", children: getErrorMessage(adsError, "Unable to load ads performance.") }), loadingAds && _jsx(AppLoading, {}), !loadingAds && !adsError && (_jsxs(Table, { headers: ["Platform", "Spend", "Impr.", "Clicks", "Conv.", "CPQA"], children: [ads?.map((ad) => (_jsxs("tr", { children: [_jsx("td", { children: ad.platform }), _jsxs("td", { children: ["$", ad.spend.toLocaleString()] }), _jsx("td", { children: ad.impressions.toLocaleString() }), _jsx("td", { children: ad.clicks.toLocaleString() }), _jsx("td", { children: ad.conversions.toLocaleString() }), _jsx("td", { children: ad.qualifiedApplications
                                                    ? `$${Math.round(ad.spend / ad.qualifiedApplications)}`
                                                    : "–" })] }, ad.id))), !ads?.length && (_jsx("tr", { children: _jsx("td", { colSpan: 6, children: "No ads data available yet." }) }))] }))] })] }), attributionError && (_jsx("p", { className: "text-red-700", children: getErrorMessage(attributionError, "Unable to load attribution analytics.") })), _jsx(CampaignAnalytics, {}), _jsx(CampaignList, {}), _jsx(AdsList, {}), _jsx(ABTestingSuite, {}), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsx(BulkEmailComposer, {}), _jsx(BulkSMSComposer, {})] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsx(RetargetingRules, {}), _jsx(RetargetingAudienceList, {})] }), _jsx(AttributionDashboard, { data: attribution, loading: loadingAttribution }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [assetsError && _jsx("p", { className: "text-red-700", children: getErrorMessage(assetsError, "Unable to load brand assets.") }), _jsx(BrandLibrary, { assets: assets }), _jsx(MarketingToDoList, {})] })] }));
};
export default MarketingDashboard;
