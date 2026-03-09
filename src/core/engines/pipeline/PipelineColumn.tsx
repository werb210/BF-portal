import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import PipelineCard from "./PipelineCard";
import type { PipelineApplication, PipelineStage } from "./pipeline.types";

const LoadingSkeleton = () => (
  <div className="pipeline-card pipeline-card--skeleton">
    <div className="skeleton-line" />
    <div className="skeleton-line skeleton-line--short" />
    <div className="skeleton-pill-row">
      <span className="skeleton-pill" />
      <span className="skeleton-pill" />
    </div>
    <div className="skeleton-line" />
  </div>
);

const EmptyState = ({ label }: { label: string }) => (
  <div className="pipeline-column__empty">No applications in {label}.</div>
);

type PipelineColumnProps = {
  stage: PipelineStage;
  stageLabel: string;
  cards: PipelineApplication[];
  isLoading: boolean;
  onCardClick: (id: string) => void;
  selectedIds: string[];
  selectable: boolean;
  onSelectCard: (id: string) => void;
};

const PipelineColumn = ({
  stage,
  stageLabel,
  cards,
  isLoading,
  onCardClick,
  selectedIds,
  selectable,
  onSelectCard
}: PipelineColumnProps) => {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const rowVirtualizer = useVirtualizer({
    count: cards.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 180,
    overscan: 6
  });

  return (
    <div className="pipeline-column" data-stage={stage.id} data-testid={`pipeline-column-${stage.id}`}>
      <div className="pipeline-column__header">
        <div>
          <div className="pipeline-column__title">{stageLabel}</div>
          {stage.description && <div className="pipeline-column__subtitle">{stage.description}</div>}
        </div>
        {stage.terminal && <span className="pipeline-column__pill">Terminal</span>}
      </div>
      <div className="pipeline-column__body" ref={parentRef}>
        {isLoading && (
          <>
            <LoadingSkeleton />
            <LoadingSkeleton />
          </>
        )}
        {!isLoading && !cards.length && <EmptyState label={stageLabel} />}
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative"
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const card = cards[virtualRow.index];
            if (!card) return null;
            return (
              <div
                key={card.id}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualRow.start}px)`
                }}
              >
                <PipelineCard
                  card={card}
                  stageId={stage.id}
                  onClick={onCardClick}
                  isSelected={selectedIds.includes(card.id)}
                  selectable={selectable}
                  onSelectChange={onSelectCard}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PipelineColumn;
