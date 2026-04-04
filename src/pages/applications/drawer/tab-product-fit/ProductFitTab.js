import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useApplicationDetails } from "@/pages/applications/hooks/useApplicationDetails";
import { DetailSection } from "@/pages/applications/ApplicationDetails";
import { getErrorMessage } from "@/utils/errors";
const renderMatchValue = (value) => {
    if (value == null || value === "")
        return "Pending";
    return typeof value === "number" ? `${value}%` : `${value}%`;
};
const ProductFitTab = () => {
    const { applicationId, data: details, isLoading, error } = useApplicationDetails();
    if (!applicationId)
        return _jsx("div", { className: "drawer-placeholder", children: "Select an application to view product fit." });
    if (isLoading)
        return _jsx("div", { className: "drawer-placeholder", children: "Loading product fit\u2026" });
    if (error)
        return _jsx("div", { className: "drawer-placeholder", children: getErrorMessage(error, "Unable to load product fit.") });
    const matchScores = details?.matchScores ?? [];
    return (_jsxs("div", { className: "drawer-tab drawer-tab__product-fit", children: [_jsx(DetailSection, { title: "Product Fit", data: details?.productFit ?? null }), _jsxs("div", { className: "drawer-section", children: [_jsx("div", { className: "drawer-section__title", children: "Match Scores" }), _jsx("div", { className: "drawer-section__body", children: matchScores.length ? (_jsx("div", { className: "drawer-list", children: matchScores.map((score, index) => (_jsx("div", { className: "drawer-list__item", children: _jsxs("div", { className: "drawer-kv-list", children: [_jsxs("div", { className: "drawer-kv-list__item", children: [_jsx("dt", { children: "Product" }), _jsx("dd", { children: score.productName ?? score.productId ?? "Unlabeled product" })] }), _jsxs("div", { className: "drawer-kv-list__item", children: [_jsx("dt", { children: "Match" }), _jsx("dd", { children: renderMatchValue(score.matchPercentage) })] }), score.status ? (_jsxs("div", { className: "drawer-kv-list__item", children: [_jsx("dt", { children: "Status" }), _jsx("dd", { children: score.status })] })) : null, score.notes ? (_jsxs("div", { className: "drawer-kv-list__item", children: [_jsx("dt", { children: "Notes" }), _jsx("dd", { children: score.notes })] })) : null] }) }, score.productId ?? `${score.productName ?? "product"}-${index}`))) })) : (_jsx("div", { className: "drawer-placeholder", children: "No match scores provided." })) })] })] }));
};
export default ProductFitTab;
