export const PIPELINE_STAGE_ORDER = [
    "DRAFT",
    "RECEIVED",
    "IN_REVIEW",
    "DOCUMENTS_REQUIRED",
    "STARTUP",
    "OFF_TO_LENDER",
    "OFFER",
    "ACCEPTED",
    "REJECTED"
];
export const PIPELINE_STAGE_LABELS = {
    DRAFT: "New (Website)",
    RECEIVED: "Received",
    INREVIEW: "In Review",
    DOCUMENTSREQUIRED: "Documents Required",
    STARTUP: "Start-up",
    OFFTOLENDER: "Off to Lender",
    OFFER: "Offer",
    ACCEPTED: "Accepted",
    REJECTED: "Rejected"
};
export const normalizeStageId = (value) => value.replace(/[\s_-]+/g, "").toUpperCase();
export const sortPipelineStages = (stages) => {
    if (!stages.length)
        return [];
    const hasOrder = stages.some((stage) => typeof stage.order === "number");
    const normalizedOrder = PIPELINE_STAGE_ORDER.map(normalizeStageId);
    const getOrderIndex = (id) => {
        const normalized = normalizeStageId(id);
        const index = normalizedOrder.indexOf(normalized);
        return index === -1 ? Number.POSITIVE_INFINITY : index;
    };
    const hasKnownStages = stages.some((stage) => getOrderIndex(stage.id) !== Number.POSITIVE_INFINITY);
    if (!hasOrder || hasKnownStages) {
        return [...stages]
            .map((stage, index) => ({ stage, index }))
            .sort((a, b) => {
            const aOrder = getOrderIndex(a.stage.id);
            const bOrder = getOrderIndex(b.stage.id);
            if (aOrder !== bOrder) {
                return aOrder - bOrder;
            }
            return a.index - b.index;
        })
            .map((entry) => entry.stage);
    }
    return [...stages]
        .map((stage, index) => ({ stage, index }))
        .sort((a, b) => {
        const aOrder = typeof a.stage.order === "number" ? a.stage.order : Number.POSITIVE_INFINITY;
        const bOrder = typeof b.stage.order === "number" ? b.stage.order : Number.POSITIVE_INFINITY;
        if (aOrder !== bOrder) {
            return aOrder - bOrder;
        }
        return a.index - b.index;
    })
        .map((entry) => entry.stage);
};
export const buildStageLabelMap = (stages) => stages.reduce((acc, stage) => ({ ...acc, [stage.id]: stage.label }), {});
export const getStageById = (stages, stageId) => stages.find((stage) => stage.id === stageId);
const buildTransitionMessage = (nextStageLabel) => nextStageLabel
    ? `Applications can only move to ${nextStageLabel} from here.`
    : "Applications can only move to the next stage from here.";
export const evaluateStageTransition = ({ card, fromStage, toStage, stages }) => {
    if (!card || !fromStage || !toStage || fromStage === toStage) {
        return { allowed: false };
    }
    const fromStageConfig = getStageById(stages, fromStage);
    if (!fromStageConfig) {
        return { allowed: false, reason: "Applications cannot be moved from an unknown stage." };
    }
    if (fromStageConfig.terminal) {
        return { allowed: false, reason: "Applications in terminal stages cannot be moved." };
    }
    if (fromStageConfig.allowedTransitions && fromStageConfig.allowedTransitions.length > 0) {
        return fromStageConfig.allowedTransitions.includes(toStage)
            ? { allowed: true }
            : { allowed: false, reason: "That stage change is not allowed." };
    }
    const orderedStageIds = stages.map((stage) => stage.id);
    const fromIndex = orderedStageIds.indexOf(fromStage);
    const toIndex = orderedStageIds.indexOf(toStage);
    if (fromIndex === -1 || toIndex === -1) {
        return { allowed: false, reason: "That stage change is not supported." };
    }
    if (toIndex === fromIndex + 1) {
        return { allowed: true };
    }
    const nextStage = orderedStageIds[fromIndex + 1];
    const nextStageLabel = nextStage ? buildStageLabelMap(stages)[nextStage] : undefined;
    return { allowed: false, reason: buildTransitionMessage(nextStageLabel) };
};
