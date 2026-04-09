import { useEffect, useMemo, useState } from "react";
import { DndContext, DragOverlay, closestCenter, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Card from "@/components/ui/Card";
import { retryUnlessClientError } from "@/api/retryPolicy";
import { useSilo } from "@/hooks/useSilo";
import type { Silo } from "@/types/silo";
import BIPipelineCard from "./BIPipelineCard";
import BIPipelineColumn from "./BIPipelineColumn";
import BIApplicationDrawer from "./viewer/BIApplicationDrawer";
import { biPipelineApi } from "./bi.pipeline.api";
import { BI_PIPELINE_STAGES, type BIPipelineApplication, type BIStageId } from "./bi.pipeline.types";

const BIPipelinePage = () => {
  const { silo, setSilo } = useSilo() as { silo: Silo; setSilo: (next: Silo) => void };
  const queryClient = useQueryClient();
  const [activeCard, setActiveCard] = useState<BIPipelineApplication | null>(null);
  const [activeStage, setActiveStage] = useState<BIStageId | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (silo !== "bi") {
      setSilo("bi");
    }
  }, [setSilo, silo]);

  const moveCard = useMutation({
    mutationFn: ({ applicationId, stageId }: { applicationId: string; stageId: BIStageId }) =>
      biPipelineApi.moveCard(applicationId, stageId),
    retry: retryUnlessClientError,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["bi", "pipeline"] });
    }
  });

  const handleDragStart = (event: DragStartEvent) => {
    const card = event.active.data.current?.card as BIPipelineApplication | undefined;
    const stageId = event.active.data.current?.stageId as BIStageId | undefined;
    if (card && stageId) {
      setActiveCard(card);
      setActiveStage(stageId);
    }
  };

  const handleDragEnd = useMemo(
    () =>
      async (event: DragEndEvent) => {
        const overStage = event.over?.id as BIStageId | undefined;
        const card = event.active.data.current?.card as BIPipelineApplication | undefined;

        if (!card || !overStage || overStage === card.stage) {
          setActiveCard(null);
          setActiveStage(null);
          return;
        }

        const stage = BI_PIPELINE_STAGES.find((item) => item.id === overStage);
        if (stage?.pgiOwned) {
          setActiveCard(null);
          setActiveStage(null);
          return;
        }

        await moveCard.mutateAsync({ applicationId: card.id, stageId: overStage });

        setActiveCard(null);
        setActiveStage(null);
      },
    [moveCard]
  );

  if (silo !== "bi") {
    return null;
  }

  return (
    <div className="pipeline-page">
      <Card title="BI Application Pipeline">
        <DndContext collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="pipeline-columns">
            {BI_PIPELINE_STAGES.map((stage) => (
              <BIPipelineColumn key={stage.id} stage={stage} onCardClick={setSelectedId} activeCard={activeCard} />
            ))}
          </div>
          <DragOverlay>
            {activeCard ? <BIPipelineCard card={activeCard} stageId={activeStage ?? activeCard.stage} onClick={setSelectedId} /> : null}
          </DragOverlay>
        </DndContext>
      </Card>

      <BIApplicationDrawer applicationId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
};

export default BIPipelinePage;
