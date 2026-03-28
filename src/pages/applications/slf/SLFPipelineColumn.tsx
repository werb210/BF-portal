import { useEffect, useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { useQuery } from "@tanstack/react-query";
import SLFPipelineCard from "./SLFPipelineCard";
import { slfPipelineApi } from "./slf.pipeline.api";
import type { SLFPipelineApplication, SLFStageId, SLFPipelineStage } from "./slf.pipeline.types";
import { retryUnlessClientError } from "@/api/retryPolicy";
import { getErrorMessage } from "@/utils/errors";
import { emitUiTelemetry } from "@/utils/uiTelemetry";

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

type SLFPipelineColumnProps = {
  stage: SLFPipelineStage;
  onCardClick: (id: string) => void;
  activeCard?: SLFPipelineApplication | null;
};

const SLFPipelineColumn = ({ stage, onCardClick, activeCard }: SLFPipelineColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const { data = [], isLoading, error } = useQuery<SLFPipelineApplication[]>({
    queryKey: ["slf", "pipeline", stage.id],
    queryFn: ({ signal }) => slfPipelineApi.fetchColumn(stage.id, { signal }),
    staleTime: 30_000,
    retry: retryUnlessClientError
  });

  const sortedData = useMemo(() => {
    const items = [...data];
    return items.sort(
      (a, b) =>
        new Date(b.receivedDate).getTime() - new Date(a.receivedDate).getTime() ||
        a.id.localeCompare(b.id)
    );
  }, [data]);

  useEffect(() => {
    if (!isLoading && !error) {
      emitUiTelemetry("data_loaded", { view: "slf_pipeline", stage: stage.id, count: sortedData.length });
    }
  }, [error, isLoading, sortedData.length, stage.id]);

  return (
    <div className="pipeline-column" ref={setNodeRef} data-stage={stage.id}>
      <div className="pipeline-column__header">
        <div>
          <div className="pipeline-column__title">{stage.label}</div>
          {stage.description && <div className="pipeline-column__subtitle">{stage.description}</div>}
        </div>
        {stage.terminal && <span className="pipeline-column__pill">Terminal</span>}
      </div>
      <div
        className={`pipeline-column__body${isOver ? " pipeline-column__body--over" : ""}`}
      >
        {isLoading && (
          <>
            <LoadingSkeleton />
            <LoadingSkeleton />
          </>
        )}
        {error && !isLoading && <div className="pipeline-column__empty">{getErrorMessage(error, "Unable to load applications.")}</div>}
        {!error && !isLoading && !data.length && <EmptyState label={stage.label} />}
        {sortedData.map((card) => (
          <SLFPipelineCard key={card.id} card={card} stageId={stage.id} onClick={onCardClick} />
        ))}
        {activeCard && <div className="pipeline-column__spacer" />}
      </div>
    </div>
  );
};

export default SLFPipelineColumn;
