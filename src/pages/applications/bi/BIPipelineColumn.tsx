import { useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { useQuery } from "@tanstack/react-query";
import { retryUnlessClientError } from "@/api/retryPolicy";
import { getErrorMessage } from "@/utils/errors";
import BIPipelineCard from "./BIPipelineCard";
import { biPipelineApi } from "./bi.pipeline.api";
import type { BIPipelineApplication, BIPipelineStage } from "./bi.pipeline.types";

const LoadingSkeleton = () => (
  <div className="pipeline-card pipeline-card--skeleton">
    <div className="skeleton-line" />
    <div className="skeleton-line skeleton-line--short" />
    <div className="skeleton-pill-row">
      <span className="skeleton-pill" />
    </div>
    <div className="skeleton-line" />
  </div>
);

const EmptyState = ({ label }: { label: string }) => <div className="pipeline-column__empty">No applications in {label}.</div>;

type BIPipelineColumnProps = {
  stage: BIPipelineStage;
  onCardClick: (id: string) => void;
  activeCard?: BIPipelineApplication | null;
};

const BIPipelineColumn = ({ stage, onCardClick, activeCard }: BIPipelineColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  const { data = [], isLoading, error } = useQuery<BIPipelineApplication[]>({
    queryKey: ["bi", "pipeline", stage.id],
    queryFn: ({ signal }) => biPipelineApi.fetchColumn(stage.id, { signal }),
    staleTime: 30_000,
    retry: retryUnlessClientError
  });

  const sortedData = useMemo(() => {
    const items = [...data];
    return items.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime() ||
        a.id.localeCompare(b.id)
    );
  }, [data]);

  return (
    <div className="pipeline-column" ref={setNodeRef} data-stage={stage.id}>
      <div className="pipeline-column__header">
        <div>
          <div className="pipeline-column__title">{stage.label}</div>
          <div className="pipeline-column__subtitle">{stage.description}</div>
        </div>
        {stage.pgiOwned ? <span className="pipeline-column__pill pipeline-column__pill--blue">PGI</span> : null}
      </div>
      <div className={`pipeline-column__body${isOver ? " pipeline-column__body--over" : ""}`}>
        {isLoading ? (
          <>
            <LoadingSkeleton />
            <LoadingSkeleton />
          </>
        ) : null}
        {error && !isLoading ? <div className="pipeline-column__empty">{getErrorMessage(error, "Unable to load applications.")}</div> : null}
        {!error && !isLoading && !sortedData.length ? <EmptyState label={stage.label} /> : null}
        {sortedData.map((card) => (
          <BIPipelineCard key={card.id} card={card} stageId={stage.id} onClick={onCardClick} />
        ))}
        {activeCard ? <div className="pipeline-column__spacer" /> : null}
      </div>
    </div>
  );
};

export default BIPipelineColumn;
