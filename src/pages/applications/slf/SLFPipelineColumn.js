import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { useQuery } from "@tanstack/react-query";
import SLFPipelineCard from "./SLFPipelineCard";
import { slfPipelineApi } from "./slf.pipeline.api";
import { retryUnlessClientError } from "@/api/retryPolicy";
import { getErrorMessage } from "@/utils/errors";
import { emitUiTelemetry } from "@/utils/uiTelemetry";
const LoadingSkeleton = () => (_jsxs("div", { className: "pipeline-card pipeline-card--skeleton", children: [_jsx("div", { className: "skeleton-line" }), _jsx("div", { className: "skeleton-line skeleton-line--short" }), _jsxs("div", { className: "skeleton-pill-row", children: [_jsx("span", { className: "skeleton-pill" }), _jsx("span", { className: "skeleton-pill" })] }), _jsx("div", { className: "skeleton-line" })] }));
const EmptyState = ({ label }) => (_jsxs("div", { className: "pipeline-column__empty", children: ["No applications in ", label, "."] }));
const SLFPipelineColumn = ({ stage, onCardClick, activeCard }) => {
    const { setNodeRef, isOver } = useDroppable({ id: stage.id });
    const { data = [], isLoading, error } = useQuery({
        queryKey: ["slf", "pipeline", stage.id],
        queryFn: ({ signal }) => slfPipelineApi.fetchColumn(stage.id, { signal }),
        staleTime: 30_000,
        retry: retryUnlessClientError
    });
    const sortedData = useMemo(() => {
        const items = [...data];
        return items.sort((a, b) => new Date(b.receivedDate).getTime() - new Date(a.receivedDate).getTime() ||
            a.id.localeCompare(b.id));
    }, [data]);
    useEffect(() => {
        if (!isLoading && !error) {
            emitUiTelemetry("data_loaded", { view: "slf_pipeline", stage: stage.id, count: sortedData.length });
        }
    }, [error, isLoading, sortedData.length, stage.id]);
    return (_jsxs("div", { className: "pipeline-column", ref: setNodeRef, "data-stage": stage.id, children: [_jsxs("div", { className: "pipeline-column__header", children: [_jsxs("div", { children: [_jsx("div", { className: "pipeline-column__title", children: stage.label }), stage.description && _jsx("div", { className: "pipeline-column__subtitle", children: stage.description })] }), stage.terminal && _jsx("span", { className: "pipeline-column__pill", children: "Terminal" })] }), _jsxs("div", { className: `pipeline-column__body${isOver ? " pipeline-column__body--over" : ""}`, children: [isLoading && (_jsxs(_Fragment, { children: [_jsx(LoadingSkeleton, {}), _jsx(LoadingSkeleton, {})] })), error && !isLoading && _jsx("div", { className: "pipeline-column__empty", children: getErrorMessage(error, "Unable to load applications.") }), !error && !isLoading && !data.length && _jsx(EmptyState, { label: stage.label }), sortedData.map((card) => (_jsx(SLFPipelineCard, { card: card, stageId: stage.id, onClick: onCardClick }, card.id))), activeCard && _jsx("div", { className: "pipeline-column__spacer" })] })] }));
};
export default SLFPipelineColumn;
