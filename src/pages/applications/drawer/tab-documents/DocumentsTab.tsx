import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { acceptDocument, fetchDocumentRequirements, rejectDocument } from "@/api/documents";
import { retryUnlessClientError } from "@/api/retryPolicy";
import Modal from "@/components/ui/Modal";
import { useApplicationDetails } from "@/pages/applications/hooks/useApplicationDetails";
import { useAuth } from "@/hooks/useAuth";
import { useApplicationDrawerStore } from "@/state/applicationDrawer.store";
import type { DocumentRequirement } from "@/types/documents.types";
import { getErrorMessage } from "@/utils/errors";
import { canAccessStaffPortal, resolveUserRole } from "@/utils/roles";

const DocumentsTab = () => {
  const applicationId = useApplicationDrawerStore((state) => state.selectedApplicationId);
  const { data: applicationDetails } = useApplicationDetails();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isStaff = canAccessStaffPortal(resolveUserRole((user as { role?: string | null } | null)?.role ?? null));
  const { data: documents = [], isLoading, error, refetch } = useQuery<DocumentRequirement[]>({
    queryKey: ["applications", applicationId, "documents"],
    queryFn: ({ signal }) => fetchDocumentRequirements(applicationId ?? "", { signal }),
    enabled: Boolean(applicationId),
    retry: retryUnlessClientError
  });
  const [activeAction, setActiveAction] = useState<{ type: "accept" | "reject"; document: DocumentRequirement } | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const groupedDocuments = useMemo(() => {
    const grouped = new Map<string, DocumentRequirement[]>();
    documents.forEach((doc) => {
      const category = doc.category?.trim() || "Uncategorized";
      const list = grouped.get(category) ?? [];
      list.push(doc);
      grouped.set(category, list);
    });
    return Array.from(grouped.entries());
  }, [documents]);

  if (!applicationId) return <div className="drawer-placeholder">Select an application to view documents.</div>;
  if (isLoading) return <div className="drawer-placeholder">Loading documents…</div>;
  if (error) return <div className="drawer-placeholder">{getErrorMessage(error, "Unable to load documents.")}</div>;

  const ocrCompletedAt = (applicationDetails as { ocr_completed_at?: string | null } | null)?.ocr_completed_at;
  const ocrStatusLabel = (() => {
    if (ocrCompletedAt === undefined) return "Unknown";
    if (ocrCompletedAt === null) return "Processing…";
    return "Completed";
  })();

  const normalizeStatus = (status?: string | null) => status?.toLowerCase() ?? "unknown";
  const statusLabel = (status?: string | null) => {
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

  const statusClass = (status?: string | null) => `doc-status doc-status--${normalizeStatus(status)}`;

  const formatUploadedBy = (value?: string | null) => {
    if (!value) return "—";
    const normalized = value.toLowerCase();
    if (normalized === "client") return "Client";
    if (normalized === "staff") return "Staff";
    return value;
  };

  const formatTimestamp = (value?: string | null) => {
    if (!value) return "—";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString();
  };

  const handleConfirmAction = async () => {
    if (!activeAction) return;
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
      } else {
        await rejectDocument(activeAction.document.id, rejectionReason.trim());
        setFeedback({ type: "success", message: "Document rejected." });
      }
      await refetch ();
      setActiveAction(null);
      setRejectionReason("");
      queryClient.invalidateQueries({ queryKey: ["applications", applicationId, "details"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });
    } catch (actionError) {
      setFeedback({ type: "error", message: getErrorMessage(actionError, "Unable to update document status.") });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    if (isSubmitting) return;
    setActiveAction(null);
    setRejectionReason("");
    setValidationError("");
  };

  return (
    <div className="drawer-tab drawer-tab__documents">
      {feedback ? (
        <div className={`documents-feedback documents-feedback--${feedback.type}`} role="status">
          {feedback.message}
        </div>
      ) : null}
      <div className="drawer-section" role="status" aria-live="polite">
        <div className="drawer-section__title">OCR Status</div>
        <div className="drawer-section__body">{ocrStatusLabel}</div>
      </div>
      {groupedDocuments.length ? (
        <div className="documents-grouped">
          {groupedDocuments.map(([category, categoryDocs]) => {
            const hasRequired = categoryDocs.some((doc) => doc.required ?? Boolean(doc.requiredBy));
            const categoryId = category.toLowerCase().replace(/[^a-z0-9]+/g, "-");
            return (
              <section key={category} className="documents-category" data-testid={`documents-category-${categoryId}`}>
                <header className="documents-category__header">
                  <h3>{category}</h3>
                  {hasRequired ? <span className="doc-requirement doc-requirement--required">Required</span> : null}
                </header>
                <ul className="documents-category__list">
                  {categoryDocs.map((doc) => {
                    const isRequired = doc.required ?? Boolean(doc.requiredBy);
                    const isAccepted = ["accepted", "approved"].includes(normalizeStatus(doc.status));
                    const isRejected = normalizeStatus(doc.status) === "rejected";
                    const canAccept = !isAccepted;
                    const canReject = !isRejected;
                    return (
                      <li key={doc.id} className="documents-item" data-testid={`documents-item-${doc.id}`}>
                        <div className="documents-item__info">
                          <div className="documents-item__name">{doc.name}</div>
                          <div className="documents-item__meta">
                            <span>Uploaded by {formatUploadedBy(doc.uploadedBy)}</span>
                            <span>· {formatTimestamp(doc.uploadedAt)}</span>
                          </div>
                        </div>
                        <div className="documents-item__status">
                          <span className={statusClass(doc.status)}>{statusLabel(doc.status)}</span>
                          <span className={`doc-requirement ${isRequired ? "doc-requirement--required" : "doc-requirement--optional"}`}>
                            {isRequired ? "Required" : "Optional"}
                          </span>
                        </div>
                        {isStaff ? (
                          <div className="documents-item__actions">
                            <button
                              type="button"
                              className="btn btn--primary"
                              onClick={() => {
                                setActiveAction({ type: "accept", document: doc });
                                setValidationError("");
                              }}
                              disabled={isSubmitting || !canAccept}
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              className="btn btn--danger"
                              onClick={() => {
                                setActiveAction({ type: "reject", document: doc });
                                setValidationError("");
                                setRejectionReason("");
                              }}
                              disabled={isSubmitting || !canReject}
                            >
                              Reject
                            </button>
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="drawer-placeholder">No documents uploaded.</div>
      )}
      {activeAction ? (
        <Modal
          title={activeAction.type === "accept" ? "Accept document" : "Reject document"}
          onClose={handleCloseModal}
          actions={
            <>
              <button type="button" className="btn btn--ghost" onClick={handleCloseModal} disabled={isSubmitting}>
                Cancel
              </button>
              <button
                type="button"
                className={`btn ${activeAction.type === "accept" ? "btn--primary" : "btn--danger"}`}
                onClick={handleConfirmAction}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : activeAction.type === "accept" ? "Accept" : "Reject"}
              </button>
            </>
          }
        >
          <p>
            {activeAction.type === "accept"
              ? `Confirm acceptance for ${activeAction.document.name}.`
              : `Provide a rejection reason for ${activeAction.document.name}.`}
          </p>
          {activeAction.type === "reject" ? (
            <div className="documents-modal__reason">
              <label htmlFor="document-rejection-reason" className="documents-modal__label">
                Rejection reason
              </label>
              <textarea
                id="document-rejection-reason"
                className="documents-modal__textarea"
                value={rejectionReason}
                onChange={(event) => setRejectionReason(event.target.value)}
                placeholder="Explain what needs to be corrected."
                disabled={isSubmitting}
              />
              {validationError ? <div className="documents-modal__error">{validationError}</div> : null}
            </div>
          ) : null}
        </Modal>
      ) : null}
    </div>
  );
};

export default DocumentsTab;
