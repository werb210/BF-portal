import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { acceptDocument, fetchDocumentRequirements, rejectDocument } from "@/api/documents";
import { retryUnlessClientError } from "@/api/retryPolicy";
import Modal from "@/components/ui/Modal";
import { useApplicationDetails } from "@/pages/applications/hooks/useApplicationDetails";
import { useAuth } from "@/hooks/useAuth";
import { useApplicationDrawerStore } from "@/state/applicationDrawer.store";
import { getErrorMessage } from "@/utils/errors";
import { canAccessStaffPortal, resolveUserRole } from "@/utils/roles";
const DocumentsTab = () => {
    const applicationId = useApplicationDrawerStore((state) => state.selectedApplicationId);
    const { data: applicationDetails } = useApplicationDetails();
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const isStaff = canAccessStaffPortal(resolveUserRole(user?.role ?? null));
    const { data: documents = [], isLoading, error, refetch } = useQuery({
        queryKey: ["applications", applicationId, "documents"],
        queryFn: ({ signal }) => fetchDocumentRequirements(applicationId ?? "", { signal }),
        enabled: Boolean(applicationId),
        retry: retryUnlessClientError
    });
    const [activeAction, setActiveAction] = useState(null);
    const [rejectionReason, setRejectionReason] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [validationError, setValidationError] = useState("");
    const [feedback, setFeedback] = useState(null);
    const groupedDocuments = useMemo(() => {
        const grouped = new Map();
        documents.forEach((doc) => {
            const category = doc.category?.trim() || "Uncategorized";
            const list = grouped.get(category) ?? [];
            list.push(doc);
            grouped.set(category, list);
        });
        return Array.from(grouped.entries());
    }, [documents]);
    if (!applicationId)
        return _jsx("div", { className: "drawer-placeholder", children: "Select an application to view documents." });
    if (isLoading)
        return _jsx("div", { className: "drawer-placeholder", children: "Loading documents\u2026" });
    if (error)
        return _jsx("div", { className: "drawer-placeholder", children: getErrorMessage(error, "Unable to load documents.") });
    const ocrCompletedAt = applicationDetails?.ocr_completed_at;
    const ocrStatusLabel = (() => {
        if (ocrCompletedAt === undefined)
            return "Unknown";
        if (ocrCompletedAt === null)
            return "Processing…";
        return "Completed";
    })();
    const normalizeStatus = (status) => status?.toLowerCase() ?? "unknown";
    const statusLabel = (status) => {
        switch (normalizeStatus(status)) {
            case "accepted":
            case "approved":
                return "Accepted";
            case "rejected":
                return "Rejected";
            case "uploaded":
                return "Uploaded";
            case "required":
                return "Required";
            default:
                return status ? status : "Unknown";
        }
    };
    const statusClass = (status) => `doc-status doc-status--${normalizeStatus(status)}`;
    const formatUploadedBy = (value) => {
        if (!value)
            return "—";
        const normalized = value.toLowerCase();
        if (normalized === "client")
            return "Client";
        if (normalized === "staff")
            return "Staff";
        return value;
    };
    const formatTimestamp = (value) => {
        if (!value)
            return "—";
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime()))
            return value;
        return parsed.toLocaleString();
    };
    const handleConfirmAction = async () => {
        if (!activeAction)
            return;
        if (activeAction.type === "reject" && !rejectionReason.trim()) {
            setValidationError("Rejection reason is required.");
            return;
        }
        setIsSubmitting(true);
        setValidationError("");
        setFeedback(null);
        try {
            if (activeAction.type === "accept") {
                await acceptDocument(activeAction.document.id);
                setFeedback({ type: "success", message: "Document accepted." });
            }
            else {
                await rejectDocument(activeAction.document.id, rejectionReason.trim());
                setFeedback({ type: "success", message: "Document rejected." });
            }
            await refetch();
            setActiveAction(null);
            setRejectionReason("");
            queryClient.invalidateQueries({ queryKey: ["applications", applicationId, "details"] });
            queryClient.invalidateQueries({ queryKey: ["pipeline"] });
        }
        catch (actionError) {
            setFeedback({ type: "error", message: getErrorMessage(actionError, "Unable to update document status.") });
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const handleCloseModal = () => {
        if (isSubmitting)
            return;
        setActiveAction(null);
        setRejectionReason("");
        setValidationError("");
    };
    return (_jsxs("div", { className: "drawer-tab drawer-tab__documents", children: [feedback ? (_jsx("div", { className: `documents-feedback documents-feedback--${feedback.type}`, role: "status", children: feedback.message })) : null, _jsxs("div", { className: "drawer-section", role: "status", "aria-live": "polite", children: [_jsx("div", { className: "drawer-section__title", children: "OCR Status" }), _jsx("div", { className: "drawer-section__body", children: ocrStatusLabel })] }), groupedDocuments.length ? (_jsx("div", { className: "documents-grouped", children: groupedDocuments.map(([category, categoryDocs]) => {
                    const hasRequired = categoryDocs.some((doc) => doc.required ?? Boolean(doc.requiredBy));
                    const categoryId = category.toLowerCase().replace(/[^a-z0-9]+/g, "-");
                    return (_jsxs("section", { className: "documents-category", "data-testid": `documents-category-${categoryId}`, children: [_jsxs("header", { className: "documents-category__header", children: [_jsx("h3", { children: category }), hasRequired ? _jsx("span", { className: "doc-requirement doc-requirement--required", children: "Required" }) : null] }), _jsx("ul", { className: "documents-category__list", children: categoryDocs.map((doc) => {
                                    const isRequired = doc.required ?? Boolean(doc.requiredBy);
                                    const isAccepted = ["accepted", "approved"].includes(normalizeStatus(doc.status));
                                    const isRejected = normalizeStatus(doc.status) === "rejected";
                                    const canAccept = !isAccepted;
                                    const canReject = !isRejected;
                                    return (_jsxs("li", { className: "documents-item", "data-testid": `documents-item-${doc.id}`, children: [_jsxs("div", { className: "documents-item__info", children: [_jsx("div", { className: "documents-item__name", children: doc.name }), _jsxs("div", { className: "documents-item__meta", children: [_jsxs("span", { children: ["Uploaded by ", formatUploadedBy(doc.uploadedBy)] }), _jsxs("span", { children: ["\u00B7 ", formatTimestamp(doc.uploadedAt)] })] })] }), _jsxs("div", { className: "documents-item__status", children: [_jsx("span", { className: statusClass(doc.status), children: statusLabel(doc.status) }), _jsx("span", { className: `doc-requirement ${isRequired ? "doc-requirement--required" : "doc-requirement--optional"}`, children: isRequired ? "Required" : "Optional" })] }), isStaff ? (_jsxs("div", { className: "documents-item__actions", children: [_jsx("button", { type: "button", className: "btn btn--primary", onClick: () => {
                                                            setActiveAction({ type: "accept", document: doc });
                                                            setValidationError("");
                                                        }, disabled: isSubmitting || !canAccept, children: "Accept" }), _jsx("button", { type: "button", className: "btn btn--danger", onClick: () => {
                                                            setActiveAction({ type: "reject", document: doc });
                                                            setValidationError("");
                                                            setRejectionReason("");
                                                        }, disabled: isSubmitting || !canReject, children: "Reject" })] })) : null] }, doc.id));
                                }) })] }, category));
                }) })) : (_jsx("div", { className: "drawer-placeholder", children: "No documents uploaded." })), activeAction ? (_jsxs(Modal, { title: activeAction.type === "accept" ? "Accept document" : "Reject document", onClose: handleCloseModal, actions: _jsxs(_Fragment, { children: [_jsx("button", { type: "button", className: "btn btn--ghost", onClick: handleCloseModal, disabled: isSubmitting, children: "Cancel" }), _jsx("button", { type: "button", className: `btn ${activeAction.type === "accept" ? "btn--primary" : "btn--danger"}`, onClick: handleConfirmAction, disabled: isSubmitting, children: isSubmitting ? "Saving..." : activeAction.type === "accept" ? "Accept" : "Reject" })] }), children: [_jsx("p", { children: activeAction.type === "accept"
                            ? `Confirm acceptance for ${activeAction.document.name}.`
                            : `Provide a rejection reason for ${activeAction.document.name}.` }), activeAction.type === "reject" ? (_jsxs("div", { className: "documents-modal__reason", children: [_jsx("label", { htmlFor: "document-rejection-reason", className: "documents-modal__label", children: "Rejection reason" }), _jsx("textarea", { id: "document-rejection-reason", className: "documents-modal__textarea", value: rejectionReason, onChange: (event) => setRejectionReason(event.target.value), placeholder: "Explain what needs to be corrected.", disabled: isSubmitting }), validationError ? _jsx("div", { className: "documents-modal__error", children: validationError }) : null] })) : null] })) : null] }));
};
export default DocumentsTab;
