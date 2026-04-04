import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from "@tanstack/react-query";
import { fetchOcrResults } from "@/api/ocr";
import { useApplicationDetails } from "@/pages/applications/hooks/useApplicationDetails";
import { useApplicationDrawerStore } from "@/state/applicationDrawer.store";
import { getErrorMessage } from "@/utils/errors";
const SectionBlock = ({ section }) => {
    if (!section)
        return null;
    const conflicts = section.conflicts ?? [];
    const hasConflicts = conflicts.length > 0;
    return (_jsxs("div", { className: `drawer-section ${hasConflicts ? "drawer-section--warning" : ""}`, children: [_jsx("div", { className: "drawer-section__title", children: section.title }), _jsx("div", { className: "drawer-section__body", children: _jsx("dl", { className: "drawer-kv-list", children: Object.entries(section.fields).map(([key, value]) => {
                        const conflict = conflicts.find((c) => c.field === key);
                        return (_jsxs("div", { className: `drawer-kv-list__item ${conflict ? "drawer-kv-list__item--conflict" : ""}`, children: [_jsx("dt", { children: key }), _jsx("dd", { children: String(value) }), conflict ? _jsxs("div", { className: "drawer-conflict", children: ["Conflicting values: ", conflict.values.join(", ")] }) : null] }, key));
                    }) }) })] }));
};
const FinancialTab = () => {
    const applicationId = useApplicationDrawerStore((state) => state.selectedApplicationId);
    const { data: applicationDetails, isLoading: isDetailsLoading, error: detailsError } = useApplicationDetails();
    const ocrCompletedAt = applicationDetails?.ocr_completed_at;
    const shouldFetchResults = Boolean(applicationId) && Boolean(ocrCompletedAt);
    const { data: results, isLoading, error } = useQuery({
        queryKey: ["ocr", applicationId, "results"],
        queryFn: ({ signal }) => fetchOcrResults(applicationId ?? "", { signal }),
        enabled: shouldFetchResults
    });
    if (!applicationId)
        return _jsx("div", { className: "drawer-placeholder", children: "Select an application to view financial data." });
    if (isDetailsLoading)
        return _jsx("div", { className: "drawer-placeholder", children: "Loading financial data\u2026" });
    if (detailsError)
        return _jsx("div", { className: "drawer-placeholder", children: getErrorMessage(detailsError, "Unable to load financial data.") });
    if (ocrCompletedAt === undefined)
        return _jsx("div", { className: "drawer-placeholder", children: "Unknown" });
    if (ocrCompletedAt === null)
        return _jsx("div", { className: "drawer-placeholder", children: "Pending OCR" });
    if (isLoading)
        return _jsx("div", { className: "drawer-placeholder", children: "Loading financial data\u2026" });
    if (error)
        return _jsx("div", { className: "drawer-placeholder", children: getErrorMessage(error, "Unable to load financial data.") });
    return (_jsxs("div", { className: "drawer-tab drawer-tab__financial", children: [_jsx(SectionBlock, { section: results?.balanceSheet }), _jsx(SectionBlock, { section: results?.incomeStatement }), _jsx(SectionBlock, { section: results?.cashFlow }), _jsx(SectionBlock, { section: results?.taxItems }), _jsx(SectionBlock, { section: results?.contracts }), _jsx(SectionBlock, { section: results?.invoices }), _jsx(SectionBlock, { section: results?.required }), _jsx("div", { className: "drawer-footer-actions", children: _jsx("button", { type: "button", className: "btn", disabled: true, children: "View Document" }) })] }));
};
export default FinancialTab;
