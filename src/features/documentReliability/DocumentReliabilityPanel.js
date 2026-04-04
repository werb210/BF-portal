import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from "react";
import { useOCRInsights } from "@/hooks/useOCRInsights";
import { getErrorMessage } from "@/utils/errors";
import { useDocumentReliabilityToast } from "./useDocumentReliabilityToast";
const DocumentReliabilityPanel = () => {
    const { applicationId, isLoading, error, data } = useOCRInsights();
    const conflictFields = useMemo(() => data.conflictGroups.map((group) => group.label), [data.conflictGroups]);
    const missingFields = useMemo(() => data.requiredFields.filter((field) => !field.present).map((field) => field.label), [data.requiredFields]);
    useDocumentReliabilityToast({
        applicationId,
        missingFields,
        conflictFields
    });
    if (!applicationId)
        return null;
    if (isLoading) {
        return _jsx("div", { className: "document-reliability document-reliability--loading", children: "Loading document reliability\u2026" });
    }
    if (error) {
        return (_jsx("div", { className: "document-reliability document-reliability--error", children: getErrorMessage(error, "Unable to load document reliability warnings.") }));
    }
    const hasIssues = missingFields.length > 0 || conflictFields.length > 0;
    return (_jsxs("section", { className: "document-reliability", "aria-live": "polite", children: [_jsxs("header", { className: "document-reliability__header", children: [_jsx("h3", { children: "Document Reliability" }), _jsx("span", { className: hasIssues ? "document-reliability__status" : "document-reliability__status document-reliability__status--ok", children: hasIssues ? "Review needed" : "No issues detected" })] }), hasIssues ? (_jsxs("div", { className: "document-reliability__body", children: [missingFields.length > 0 && (_jsxs("div", { className: "document-reliability__section", children: [_jsx("div", { className: "document-reliability__label", children: "Missing required OCR fields" }), _jsx("div", { className: "document-reliability__tags", children: missingFields.map((field) => (_jsx("span", { className: "document-reliability__tag document-reliability__tag--warning", children: field }, field))) })] })), conflictFields.length > 0 && (_jsxs("div", { className: "document-reliability__section", children: [_jsx("div", { className: "document-reliability__label", children: "Conflicting OCR values" }), _jsx("div", { className: "document-reliability__tags", children: conflictFields.map((field) => (_jsx("span", { className: "document-reliability__tag document-reliability__tag--alert", children: field }, field))) })] }))] })) : (_jsx("div", { className: "document-reliability__empty", children: "OCR fields are consistent across documents." }))] }));
};
export default DocumentReliabilityPanel;
