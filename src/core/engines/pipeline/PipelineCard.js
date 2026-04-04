import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { PIPELINE_STAGE_LABELS, normalizeStageId } from "./pipeline.types";
import { getProcessingStatus } from "@/pages/applications/utils/processingStatus";
const formatAmount = (value) => {
    if (typeof value !== "number" || Number.isNaN(value))
        return "—";
    return value.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
};
const formatTimeAgo = (value) => {
    if (!value)
        return "—";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime()))
        return "—";
    const diffMs = Date.now() - parsed.getTime();
    if (diffMs < 60_000)
        return "just now";
    const minutes = Math.floor(diffMs / 60_000);
    if (minutes < 60)
        return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24)
        return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7)
        return `${days}d`;
    const weeks = Math.floor(days / 7);
    return `${weeks}w`;
};
const PipelineCard = ({ card, stageId, onClick, isSelected, selectable, onSelectChange }) => {
    const handleClick = () => onClick(card.id);
    const handleSelect = (event) => {
        event.stopPropagation();
        if (!selectable)
            return;
        onSelectChange(card.id);
    };
    const updatedAtLabel = `Updated ${formatTimeAgo(card.updatedAt ?? card.createdAt)} ago`;
    const normalizedStage = normalizeStageId(stageId);
    const stageLabel = PIPELINE_STAGE_LABELS[normalizedStage] ?? stageId;
    const documentCounts = card.documents ?? {};
    const requiredDocuments = documentCounts.required ?? 0;
    const submittedDocuments = documentCounts.submitted ?? 0;
    const hasDocumentGap = requiredDocuments > 0 && submittedDocuments < requiredDocuments;
    const isDocumentsRequiredStage = normalizedStage === "DOCUMENTSREQUIRED";
    const showDocumentWarning = isDocumentsRequiredStage || hasDocumentGap;
    const stageWarningLabel = hasDocumentGap
        ? `Documents required (${submittedDocuments}/${requiredDocuments})`
        : PIPELINE_STAGE_LABELS.DOCUMENTSREQUIRED;
    const shouldShowPrimaryStagePill = !(isDocumentsRequiredStage && showDocumentWarning);
    const processingStatus = getProcessingStatus({
        ocrCompletedAt: card?.ocr_completed_at,
        bankingCompletedAt: card?.banking_completed_at
    });
    const creditSummary = [card.yearsInBusiness, card.monthlyRevenue, card.collateral].filter(Boolean).join(" • ");
    return (_jsxs("div", { onClick: handleClick, className: `pipeline-card pipeline-card--readonly${isSelected ? " pipeline-card--selected" : ""}`, "aria-label": `${card.businessName ?? "Application"} in ${stageId}`, children: [_jsx("div", { className: "pipeline-card__select", onClick: (event) => event.stopPropagation(), children: _jsx("input", { type: "checkbox", "aria-label": `Select ${card.businessName ?? "application"}`, checked: isSelected, onChange: handleSelect, disabled: !selectable }) }), card.source === "website" ? _jsx("div", { className: "pipeline-card__lead-badge", children: "Website Lead" }) : null, card.source === "credit_readiness" ? (_jsx("span", { className: "rounded bg-blue-100 px-2 py-1 text-xs text-blue-700", children: "Continuation" })) : null, _jsxs("div", { className: "pipeline-card__header", children: [_jsxs("div", { children: [_jsx("div", { className: "pipeline-card__title", children: card.businessName ?? "Unknown business" }), _jsx("div", { className: "pipeline-card__subtitle", children: card.productCategory ?? "Unspecified" })] }), _jsx("div", { className: "pipeline-card__amount", children: formatAmount(card.requestedAmount) })] }), _jsxs("div", { className: "pipeline-card__meta", children: [shouldShowPrimaryStagePill ? _jsx("span", { className: "pipeline-card__pill", children: stageLabel }) : null, showDocumentWarning ? (_jsx("span", { className: "pipeline-card__pill pipeline-card__pill--warning", children: stageWarningLabel })) : null, processingStatus ? (_jsx("span", { className: "pipeline-card__pill pipeline-card__pill--muted", children: processingStatus.badge })) : null] }), creditSummary ? _jsxs("div", { className: "pipeline-card__footer", children: ["Credit: ", creditSummary] }) : null, _jsx("div", { className: "pipeline-card__footer", children: updatedAtLabel })] }));
};
export default PipelineCard;
