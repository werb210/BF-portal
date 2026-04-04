import { jsx as _jsx } from "react/jsx-runtime";
import { useOCRInsights } from "@/hooks/useOCRInsights";
import { getErrorMessage } from "@/utils/errors";
import OcrInsightsView from "@/features/ocrInsights/OcrInsightsView";
const OCRInsightsTab = () => {
    const { applicationId, isLoading, error, data } = useOCRInsights();
    if (!applicationId)
        return _jsx("div", { className: "drawer-placeholder", children: "Select an application to view OCR insights." });
    if (isLoading)
        return _jsx("div", { className: "drawer-placeholder", children: "Loading OCR insights\u2026" });
    if (error)
        return _jsx("div", { className: "drawer-placeholder", children: getErrorMessage(error, "Unable to load OCR insights.") });
    return (_jsx("div", { className: "drawer-tab ocr-insights", children: _jsx(OcrInsightsView, { data: data }) }));
};
export default OCRInsightsTab;
