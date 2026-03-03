import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchPortalApplication } from "@/api/applications";
import { archiveOffer, fetchOffers, uploadOffer, type OfferRecord } from "@/api/offers";
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

const getStageIndex = (stage?: string | null) => {
  if (!stage) return -1;
  return stageOrder.indexOf(normalizeStageId(stage));
};

const formatTimestamp = (value?: string) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

const OffersTab = () => {
  const applicationId = useApplicationDrawerStore((state) => state.selectedApplicationId);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const canEdit = canWrite((user as { role?: string | null } | null)?.role ?? null);

  const {
    data: offers = [],
    isLoading,
    error
  } = useQuery<OfferRecord[]>({
    queryKey: ["offers", applicationId],
    queryFn: ({ signal }) => fetchOffers(applicationId ?? "", { signal }),
    enabled: Boolean(applicationId) && canEdit
  });

  const { data: application } = useQuery({
    queryKey: ["portal-application-stage", applicationId],
    queryFn: ({ signal }) => fetchPortalApplication(applicationId ?? "", { signal }),
    enabled: Boolean(applicationId) && canEdit
  });

  const currentStage =
    typeof (application as { current_stage?: string | null } | null)?.current_stage === "string"
      ? (application as { current_stage?: string | null }).current_stage
      : typeof (application as { stage?: string | null } | null)?.stage === "string"
        ? (application as { stage?: string | null }).stage
        : null;

  const isStageEligible = useMemo(() => {
    const currentIndex = getStageIndex(currentStage);
    const requiredIndex = getStageIndex(ALLOWED_UPLOAD_STAGE);
    if (currentIndex === -1 || requiredIndex === -1) return false;
    return currentIndex >= requiredIndex;
  }, [currentStage]);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadOffer(applicationId ?? "", file),
    onSuccess: (response) => {
      setUploadError(null);
      if (applicationId) {
        const userId = (user as { id?: string | null } | null)?.id ?? "unknown";
        const lenderId =
          (response as { lenderId?: string | null; lender_id?: string | null } | null)?.lenderId ??
          (response as { lenderId?: string | null; lender_id?: string | null } | null)?.lender_id ??
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
    mutationFn: (offerId: string) => archiveOffer(offerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offers", applicationId] });
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });
    }
  });

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      setUploadError("Only PDF files can be uploaded.");
      return;
    }
    uploadMutation.mutate(file);
  };

  const activeOffers = useMemo(() => {
    if (!offers) return [];
    return offers.filter((offer) => offer.status !== "archived");
  }, [offers]);

  const archivedOffers = useMemo(() => {
    if (!offers) return [];
    return offers.filter((offer) => offer.status === "archived");
  }, [offers]);

  if (!applicationId) return <div className="drawer-placeholder">Select an application to view offers.</div>;
  if (!canEdit) return <div className="drawer-placeholder">Offers are available to staff members only.</div>;
  if (isLoading) return <div className="drawer-placeholder">Loading offers…</div>;
  if (error) return <div className="drawer-placeholder">{getErrorMessage(error, "Unable to load offers.")}</div>;

  return (
    <div className="drawer-tab drawer-tab__offers">
      <div className="offers-header">
        <div>
          <div className="offers-title">Lender term sheets</div>
          <div className="offers-subtitle">Upload and review offers received from lenders.</div>
        </div>
      {activeOffers.length > 1 ? (
        <button className="btn btn--ghost" type="button" onClick={() => setShowComparison((prev) => !prev)}>
          {showComparison ? "View list" : "Compare offers"}
        </button>
      ) : null}
      </div>

      <div className="offers-upload">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="offers-upload__input"
          onChange={handleFileChange}
          disabled={!isStageEligible || uploadMutation.isPending}
        />
        <button
          className="btn btn--primary"
          type="button"
          onClick={handleUploadClick}
          disabled={!isStageEligible || uploadMutation.isPending}
        >
          {uploadMutation.isPending ? "Uploading…" : "Upload term sheet"}
        </button>
        {!isStageEligible ? (
          <div className="offers-upload__hint">Uploads unlock after Lenders Sent stage.</div>
        ) : null}
        {uploadError ? <div className="offers-upload__error">{uploadError}</div> : null}
      </div>

      {showComparison ? (
        <OfferComparisonTable offers={activeOffers} />
      ) : (
        <div className="offers-list">
          {activeOffers.length ? (
            activeOffers.map((offer) => (
              <div key={offer.id} className="offers-list__item">
                <div>
                  <div className="offers-list__lender">{offer.lenderName}</div>
                  <div className="offers-list__meta">
                    <span>{offer.fileName ?? "Term sheet"}</span>
                    <span>Uploaded {formatTimestamp(offer.uploadedAt)}</span>
                  </div>
                </div>
                <div className="offers-list__actions">
                  {offer.fileUrl ? (
                    <a className="btn btn--ghost" href={offer.fileUrl} target="_blank" rel="noreferrer">
                      View PDF
                    </a>
                  ) : null}
                  <button
                    className="btn btn--secondary"
                    type="button"
                    onClick={() => archiveMutation.mutate(offer.id)}
                    disabled={archiveMutation.isPending}
                  >
                    Archive
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="drawer-placeholder">No active offers yet.</div>
          )}
          {archivedOffers.length ? (
            <div className="offers-archived">
              <div className="offers-archived__title">Archived offers</div>
              {archivedOffers.map((offer) => (
                <div key={offer.id} className="offers-list__item offers-list__item--archived">
                  <div>
                    <div className="offers-list__lender">{offer.lenderName}</div>
                    <div className="offers-list__meta">
                      <span>{offer.fileName ?? "Term sheet"}</span>
                      <span>Uploaded {formatTimestamp(offer.uploadedAt)}</span>
                    </div>
                  </div>
                  {offer.fileUrl ? (
                    <a className="btn btn--ghost" href={offer.fileUrl} target="_blank" rel="noreferrer">
                      View PDF
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default OffersTab;
