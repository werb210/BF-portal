import type { ChangeEvent } from "react";
import type { PipelineApplication, PipelineStageId } from "./pipeline.types";
import { PIPELINE_STAGE_LABELS, normalizeStageId } from "./pipeline.types";
import { getProcessingStatus } from "@/pages/applications/utils/processingStatus";

type PipelineCardProps = {
  card: PipelineApplication;
  stageId: PipelineStageId;
  onClick: (id: string) => void;
  isSelected: boolean;
  selectable: boolean;
  onSelectChange: (id: string) => void;
};

const formatAmount = (value?: number) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return value.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
};

const formatTimeAgo = (value?: string) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  const diffMs = Date.now() - parsed.getTime();
  if (diffMs < 60_000) return "just now";
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w`;
};

const PipelineCard = ({ card, stageId, onClick, isSelected, selectable, onSelectChange }: PipelineCardProps) => {
  const handleClick = () => onClick(card.id);
  const handleSelect = (event: ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation();
    if (!selectable) return;
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
    ocrCompletedAt: (card as { ocr_completed_at?: string | null } | null)?.ocr_completed_at,
    bankingCompletedAt: (card as { banking_completed_at?: string | null } | null)?.banking_completed_at
  });
  const creditSummary = [card.yearsInBusiness, card.monthlyRevenue, card.collateral].filter(Boolean).join(" • ");

  return (
    <div
      onClick={handleClick}
      className={`pipeline-card pipeline-card--readonly${isSelected ? " pipeline-card--selected" : ""}`}
      aria-label={`${card.businessName ?? "Application"} in ${stageId}`}
    >
      <div className="pipeline-card__select" onClick={(event) => event.stopPropagation()}>
        <input
          type="checkbox"
          aria-label={`Select ${card.businessName ?? "application"}`}
          checked={isSelected}
          onChange={handleSelect}
          disabled={!selectable}
        />
      </div>
      {card.source === "website" ? <div className="pipeline-card__lead-badge">Website Lead</div> : null}
      {card.source === "credit_readiness" ? (
        <span className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700">Continuation</span>
      ) : null}
      <div className="pipeline-card__header">
        <div>
          <div className="pipeline-card__title">{card.businessName ?? "Unknown business"}</div>
          <div className="pipeline-card__subtitle">{card.productCategory ?? "Unspecified"}</div>
        </div>
        <div className="pipeline-card__amount">{formatAmount(card.requestedAmount)}</div>
      </div>
      <div className="pipeline-card__meta">
        {shouldShowPrimaryStagePill ? <span className="pipeline-card__pill">{stageLabel}</span> : null}
        {showDocumentWarning ? (
          <span className="pipeline-card__pill pipeline-card__pill--warning">{stageWarningLabel}</span>
        ) : null}
        {processingStatus ? (
          <span className="pipeline-card__pill pipeline-card__pill--muted">{processingStatus.badge}</span>
        ) : null}
      </div>
      {creditSummary ? <div className="pipeline-card__footer">Credit: {creditSummary}</div> : null}
      <div className="pipeline-card__footer">{updatedAtLabel}</div>
    </div>
  );
};

export default PipelineCard;
