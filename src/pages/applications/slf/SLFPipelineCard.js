import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useDraggable } from "@dnd-kit/core";
import clsx from "clsx";
const formatCurrency = (value) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
const SLFPipelineCard = ({ card, onClick, stageId }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: card.id,
        data: { stageId, card }
    });
    const dragStyle = transform
        ? {
            transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`
        }
        : undefined;
    return (_jsxs("div", { ref: setNodeRef, style: dragStyle, className: clsx("pipeline-card", { "pipeline-card--dragging": isDragging }), onClick: () => onClick(card.id), ...attributes, ...listeners, children: [_jsx("div", { className: "pipeline-card__title", children: card.applicantName }), _jsx("div", { className: "pipeline-card__subtitle", children: card.businessName }), _jsxs("div", { className: "pipeline-card__meta", children: [_jsx("span", { children: formatCurrency(card.requestedAmount) }), _jsx("span", { children: card.productType })] }), _jsxs("div", { className: "pipeline-card__meta", children: [_jsx("span", { children: card.country }), _jsxs("span", { children: ["Received: ", new Date(card.receivedDate).toLocaleDateString()] })] }), _jsxs("div", { className: "pipeline-card__footer", children: [_jsxs("span", { children: ["Assigned: ", card.assignedStaff ?? "Unassigned"] }), _jsx("span", { className: "pipeline-card__status", children: card.status })] })] }));
};
export default SLFPipelineCard;
