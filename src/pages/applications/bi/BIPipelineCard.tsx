import { useDraggable } from "@dnd-kit/core";
import clsx from "clsx";
import type { BIPipelineApplication, BIStageId } from "./bi.pipeline.types";

type BIPipelineCardProps = {
  card: BIPipelineApplication;
  stageId: BIStageId;
  onClick: (id: string) => void;
};

const formatCurrency = (value: number | null) => {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
};

const daysSince = (createdAt: string) => {
  const diffMs = Date.now() - new Date(createdAt).getTime();
  return Math.max(0, Math.floor(diffMs / 86_400_000));
};

const scoreClass = (score: BIPipelineApplication["core_score"]) => {
  if (score === "approve") return "pipeline-card__badge pipeline-card__badge--green";
  if (score === "decline") return "pipeline-card__badge pipeline-card__badge--red";
  return "pipeline-card__badge pipeline-card__badge--orange";
};

const BIPipelineCard = ({ card, stageId, onClick }: BIPipelineCardProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
    data: { stageId, card }
  });

  const dragStyle = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={dragStyle}
      className={clsx("pipeline-card", { "pipeline-card--dragging": isDragging })}
      onClick={() => onClick(card.id)}
      {...attributes}
      {...listeners}
    >
      <div className="pipeline-card__title">{card.business_name}</div>
      <div className="pipeline-card__subtitle">{card.primary_contact_name ?? "No primary contact"}</div>
      <div className="pipeline-card__pill-row">
        <span className={scoreClass(card.core_score)}>CORE: {card.core_score ?? "review"}</span>
      </div>
      <div className="pipeline-card__meta">
        <span>Premium: {formatCurrency(card.annual_premium)}</span>
        <span>Coverage: {formatCurrency(card.coverage_amount)}</span>
      </div>
      <div className="pipeline-card__footer">
        <span className="pipeline-card__ref">UW Ref: {card.underwriter_ref ?? "—"}</span>
        <span>{daysSince(card.created_at)}d old</span>
      </div>
    </div>
  );
};

export default BIPipelineCard;
