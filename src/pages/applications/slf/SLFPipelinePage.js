import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { DndContext, DragOverlay, closestCenter } from "@dnd-kit/core";
import { useQueryClient } from "@tanstack/react-query";
import Card from "@/components/ui/Card";
import { useSilo } from "@/hooks/useSilo";
import SLFPipelineColumn from "./SLFPipelineColumn";
import SLFPipelineCard from "./SLFPipelineCard";
import { SLF_PIPELINE_STAGES } from "./slf.pipeline.types";
import { slfPipelineApi } from "./slf.pipeline.api";
import SLFApplicationDrawer from "./viewer/SLFApplicationDrawer";
const NoPipelineAvailable = ({ silo }) => (_jsxs("div", { className: "pipeline-empty", children: ["Pipeline is not available for the ", silo, " silo."] }));
const SLFPipelinePage = () => {
    const { silo } = useSilo();
    const queryClient = useQueryClient();
    const [activeCard, setActiveCard] = useState(null);
    const [activeStage, setActiveStage] = useState(null);
    const [selectedId, setSelectedId] = useState(null);
    const handleCardClick = (id) => setSelectedId(id);
    const handleDragStart = (event) => {
        const card = event.active.data.current?.card;
        const stageId = event.active.data.current?.stageId;
        if (card && stageId) {
            setActiveCard(card);
            setActiveStage(stageId);
        }
    };
    const handleDragEnd = useMemo(() => async (event) => {
        const overStage = event.over?.id;
        const card = event.active.data.current?.card;
        if (card && overStage && overStage !== card.status) {
            await slfPipelineApi.moveCard(card.id, overStage);
            queryClient.invalidateQueries({ queryKey: ["slf", "pipeline"] });
        }
        setActiveCard(null);
        setActiveStage(null);
    }, [queryClient]);
    if (silo !== "SLF") {
        return _jsx(NoPipelineAvailable, { silo: silo });
    }
    return (_jsxs("div", { className: "pipeline-page", children: [_jsx(Card, { title: "SLF Application Pipeline", children: _jsxs(DndContext, { collisionDetection: closestCenter, onDragStart: handleDragStart, onDragEnd: handleDragEnd, children: [_jsx("div", { className: "pipeline-columns", children: SLF_PIPELINE_STAGES.map((stage) => (_jsx(SLFPipelineColumn, { stage: stage, onCardClick: handleCardClick, activeCard: activeCard }, stage.id))) }), _jsx(DragOverlay, { children: activeCard ? _jsx(SLFPipelineCard, { card: activeCard, stageId: activeStage ?? "received", onClick: handleCardClick }) : null })] }) }), _jsx(SLFApplicationDrawer, { applicationId: selectedId, onClose: () => setSelectedId(null) })] }));
};
export default SLFPipelinePage;
