import { useMemo, useState } from "react";
import { DndContext, DragOverlay, closestCenter, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { useQueryClient } from "@tanstack/react-query";
import Card from "@/components/ui/Card";
import { useSilo } from "@/hooks/useSilo";
import SLFPipelineColumn from "./SLFPipelineColumn";
import SLFPipelineCard from "./SLFPipelineCard";
import { SLF_PIPELINE_STAGES, type SLFPipelineApplication, type SLFStageId } from "./slf.pipeline.types";
import { slfPipelineApi } from "./slf.pipeline.api";
import SLFApplicationDrawer from "./viewer/SLFApplicationDrawer";

const NoPipelineAvailable = ({ silo }: { silo: string }) => (
  <div className="pipeline-empty">Pipeline is not available for the {silo} silo.</div>
);

const SLFPipelinePage = () => {
  const { silo } = useSilo();
  const queryClient = useQueryClient();
  const [activeCard, setActiveCard] = useState<SLFPipelineApplication | null>(null);
  const [activeStage, setActiveStage] = useState<SLFStageId | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleCardClick = (id: string) => setSelectedId(id);

  const handleDragStart = (event: DragStartEvent) => {
    const card = event.active.data.current?.card as SLFPipelineApplication | undefined;
    const stageId = event.active.data.current?.stageId as SLFStageId | undefined;
    if (card && stageId) {
      setActiveCard(card);
      setActiveStage(stageId);
    }
  };

  const handleDragEnd = useMemo(
    () =>
      async (event: DragEndEvent) => {
        const overStage = event.over?.id as SLFStageId | undefined;
        const card = event.active.data.current?.card as SLFPipelineApplication | undefined;
        if (card && overStage && overStage !== card.status) {
          await slfPipelineApi.moveCard(card.id, overStage);
          queryClient.invalidateQueries({ queryKey: ["slf", "pipeline"] });
        }
        setActiveCard(null);
        setActiveStage(null);
      },
    [queryClient]
  );

  if (silo !== "SLF") {
    return <NoPipelineAvailable silo={silo} />;
  }

  return (
    <div className="pipeline-page">
      <Card title="SLF Application Pipeline">
        <DndContext collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="pipeline-columns">
            {SLF_PIPELINE_STAGES.map((stage) => (
              <SLFPipelineColumn key={stage.id} stage={stage} onCardClick={handleCardClick} activeCard={activeCard} />
            ))}
          </div>
          <DragOverlay>
            {activeCard ? <SLFPipelineCard card={activeCard} stageId={activeStage ?? "received"} onClick={handleCardClick} /> : null}
          </DragOverlay>
        </DndContext>
      </Card>
      <SLFApplicationDrawer applicationId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
};

export default SLFPipelinePage;
