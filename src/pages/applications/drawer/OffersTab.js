import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchPortalApplication } from "@/api/applications";
import { archiveOffer, fetchOffers, uploadOffer } from "@/api/offers";
import OfferComparisonTable from "./OfferComparisonTable";
import { useApplicationDrawerStore } from "@/state/applicationDrawer.store";
import { getErrorMessage } from "@/utils/errors";
import { useAuth } from "@/hooks/useAuth";
import { canWrite } from "@/auth/can";
import { normalizeStageId } from "@/core/engines/pipeline/pipeline.types";
import { trackPortalEvent } from "@/lib/portalTracking";
const ALLOWED_UPLOAD_STAGE = "LENDERS_SENT";
const stageOrder = [
    "RECEIVED",
    "IN_REVIEW",
    "DOCUMENTS_REQUIRED",
    "STARTUP",
    "OFF_TO_LENDER",
    "LENDERS_SENT",
    "OFFER",
    "ACCEPTED",
    "REJECTED"
].map(normalizeStageId);
const getStageIndex = (stage) => {
    if (!stage)
        return -1;
    return stageOrder.indexOf(normalizeStageId(stage));
};
const formatTimestamp = (value) => {
    if (!value)
        return "—";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime()))
        return value;
    return parsed.toLocaleString();
};
const OffersTab = () => {
    const applicationId = useApplicationDrawerStore((state) => state.selectedApplicationId);
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const fileInputRef = useRef(null);
    const [showComparison, setShowComparison] = useState(false);
    const [uploadError, setUploadError] = useState(null);
    const canEdit = canWrite(user?.role ?? null);
    const { data: offers = [], isLoading, error } = useQuery({
        queryKey: ["offers", applicationId],
        queryFn: ({ signal }) => fetchOffers(applicationId ?? "", { signal }),
        enabled: Boolean(applicationId) && canEdit
    });
    const { data: application } = useQuery({
        queryKey: ["portal-application-stage", applicationId],
        queryFn: ({ signal }) => fetchPortalApplication(applicationId ?? "", { signal }),
        enabled: Boolean(applicationId) && canEdit
    });
    const currentStage = typeof application?.current_stage === "string"
        ? application.current_stage
        : typeof application?.stage === "string"
            ? application.stage
            : null;
    const isStageEligible = useMemo(() => {
        const currentIndex = getStageIndex(currentStage);
        const requiredIndex = getStageIndex(ALLOWED_UPLOAD_STAGE);
        if (currentIndex === -1 || requiredIndex === -1)
            return false;
        return currentIndex >= requiredIndex;
    }, [currentStage]);
    const uploadMutation = useMutation({
        mutationFn: (file) => uploadOffer({ applicationId: applicationId ?? "", fileName: file.name }),
        onSuccess: (response) => {
            setUploadError(null);
            if (applicationId) {
                const userId = user?.id ?? "unknown";
                const lenderId = response?.lenderId ??
                    response?.lender_id ??
                    "unknown";
                trackPortalEvent("staff_action", {
                    user_id: userId,
                    action_type: "offer_upload",
                    application_id: applicationId,
                    lender_id: lenderId
                });
                trackPortalEvent("offer_uploaded", {
                    application_id: applicationId,
                    lender_id: lenderId,
                    user_id: userId
                });
            }
            queryClient.invalidateQueries({ queryKey: ["offers", applicationId] });
            queryClient.invalidateQueries({ queryKey: ["pipeline"] });
        },
        onError: (err) => setUploadError(getErrorMessage(err, "Unable to upload the offer."))
    });
    const archiveMutation = useMutation({
        mutationFn: (offerId) => archiveOffer(offerId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["offers", applicationId] });
            queryClient.invalidateQueries({ queryKey: ["pipeline"] });
        }
    });
    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };
    const handleFileChange = (event) => {
        const file = event.target.files?.[0];
        if (!file)
            return;
        if (file.type !== "application/pdf") {
            setUploadError("Only PDF files can be uploaded.");
            return;
        }
        uploadMutation.mutate(file);
    };
    const activeOffers = useMemo(() => {
        if (!offers)
            return [];
        return offers.filter((offer) => offer.status !== "archived");
    }, [offers]);
    const archivedOffers = useMemo(() => {
        if (!offers)
            return [];
        return offers.filter((offer) => offer.status === "archived");
    }, [offers]);
    if (!applicationId)
        return _jsx("div", { className: "drawer-placeholder", children: "Select an application to view offers." });
    if (!canEdit)
        return _jsx("div", { className: "drawer-placeholder", children: "Offers are available to staff members only." });
    if (isLoading)
        return _jsx("div", { className: "drawer-placeholder", children: "Loading offers\u2026" });
    if (error)
        return _jsx("div", { className: "drawer-placeholder", children: getErrorMessage(error, "Unable to load offers.") });
    return (_jsxs("div", { className: "drawer-tab drawer-tab__offers", children: [_jsxs("div", { className: "offers-header", children: [_jsxs("div", { children: [_jsx("div", { className: "offers-title", children: "Lender term sheets" }), _jsx("div", { className: "offers-subtitle", children: "Upload and review offers received from lenders." })] }), activeOffers.length > 1 ? (_jsx("button", { className: "btn btn--ghost", type: "button", onClick: () => setShowComparison((prev) => !prev), children: showComparison ? "View list" : "Compare offers" })) : null] }), _jsxs("div", { className: "offers-upload", children: [_jsx("input", { ref: fileInputRef, type: "file", accept: "application/pdf", className: "offers-upload__input", onChange: handleFileChange, disabled: !isStageEligible || uploadMutation.isPending }), _jsx("button", { className: "btn btn--primary", type: "button", onClick: handleUploadClick, disabled: !isStageEligible || uploadMutation.isPending, children: uploadMutation.isPending ? "Uploading…" : "Upload term sheet" }), !isStageEligible ? (_jsx("div", { className: "offers-upload__hint", children: "Uploads unlock after Lenders Sent stage." })) : null, uploadError ? _jsx("div", { className: "offers-upload__error", children: uploadError }) : null] }), showComparison ? (_jsx(OfferComparisonTable, { offers: activeOffers })) : (_jsxs("div", { className: "offers-list", children: [activeOffers.length ? (activeOffers.map((offer) => (_jsxs("div", { className: "offers-list__item", children: [_jsxs("div", { children: [_jsx("div", { className: "offers-list__lender", children: offer.lenderName }), _jsxs("div", { className: "offers-list__meta", children: [_jsx("span", { children: offer.fileName ?? "Term sheet" }), _jsxs("span", { children: ["Uploaded ", formatTimestamp(offer.uploadedAt)] })] })] }), _jsxs("div", { className: "offers-list__actions", children: [offer.fileUrl ? (_jsx("a", { className: "btn btn--ghost", href: offer.fileUrl, target: "_blank", rel: "noreferrer", children: "View PDF" })) : null, _jsx("button", { className: "btn btn--secondary", type: "button", onClick: () => archiveMutation.mutate(offer.id), disabled: archiveMutation.isPending, children: "Archive" })] })] }, offer.id)))) : (_jsx("div", { className: "drawer-placeholder", children: "No active offers yet." })), archivedOffers.length ? (_jsxs("div", { className: "offers-archived", children: [_jsx("div", { className: "offers-archived__title", children: "Archived offers" }), archivedOffers.map((offer) => (_jsxs("div", { className: "offers-list__item offers-list__item--archived", children: [_jsxs("div", { children: [_jsx("div", { className: "offers-list__lender", children: offer.lenderName }), _jsxs("div", { className: "offers-list__meta", children: [_jsx("span", { children: offer.fileName ?? "Term sheet" }), _jsxs("span", { children: ["Uploaded ", formatTimestamp(offer.uploadedAt)] })] })] }), offer.fileUrl ? (_jsx("a", { className: "btn btn--ghost", href: offer.fileUrl, target: "_blank", rel: "noreferrer", children: "View PDF" })) : null] }, offer.id)))] })) : null] }))] }));
};
export default OffersTab;
