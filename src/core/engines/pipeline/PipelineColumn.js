import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import PipelineCard from "./PipelineCard";
const LoadingSkeleton = () => (_jsxs("div", { className: "pipeline-card pipeline-card--skeleton", children: [_jsx("div", { className: "skeleton-line" }), _jsx("div", { className: "skeleton-line skeleton-line--short" }), _jsxs("div", { className: "skeleton-pill-row", children: [_jsx("span", { className: "skeleton-pill" }), _jsx("span", { className: "skeleton-pill" })] }), _jsx("div", { className: "skeleton-line" })] }));
const EmptyState = ({ label }) => (_jsxs("div", { className: "pipeline-column__empty", children: ["No applications in ", label, "."] }));
const PipelineColumn = ({ stage, stageLabel, cards, isLoading, onCardClick, selectedIds, selectable, onSelectCard }) => {
    const parentRef = useRef(null);
    // TanStack Virtual returns function refs that trip `react-hooks/incompatible-library`.
    // This component intentionally uses it for performant large-column rendering.
    // eslint-disable-next-line react-hooks/incompatible-library
    const rowVirtualizer = useVirtualizer({
        count: cards.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 180,
        overscan: 6
    });
    return (_jsxs("div", { className: "pipeline-column", "data-stage": stage.id, "data-testid": `pipeline-column-${stage.id}`, children: [_jsxs("div", { className: "pipeline-column__header", children: [_jsxs("div", { children: [_jsx("div", { className: "pipeline-column__title", children: stageLabel }), stage.description && _jsx("div", { className: "pipeline-column__subtitle", children: stage.description })] }), stage.terminal && _jsx("span", { className: "pipeline-column__pill", children: "Terminal" })] }), _jsxs("div", { className: "pipeline-column__body", ref: parentRef, children: [isLoading && (_jsxs(_Fragment, { children: [_jsx(LoadingSkeleton, {}), _jsx(LoadingSkeleton, {})] })), !isLoading && !cards.length && _jsx(EmptyState, { label: stageLabel }), _jsx("div", { style: {
                            height: `${rowVirtualizer.getTotalSize()}px`,
                            width: "100%",
                            position: "relative"
                        }, children: rowVirtualizer.getVirtualItems().map((virtualRow) => {
                            const card = cards[virtualRow.index];
                            if (!card)
                                return null;
                            return (_jsx("div", { style: {
                                    position: "absolute",
                                    top: 0,
                                    left: 0,
                                    width: "100%",
                                    transform: `translateY(${virtualRow.start}px)`
                                }, children: _jsx(PipelineCard, { card: card, stageId: stage.id, onClick: onCardClick, isSelected: selectedIds.includes(card.id), selectable: selectable, onSelectChange: onSelectCard }) }, card.id));
                        }) })] })] }));
};
export default PipelineColumn;
