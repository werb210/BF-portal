import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useContext, useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import Card from "@/components/ui/Card";
import ErrorBanner from "@/components/ui/ErrorBanner";
import AppLoading from "@/components/layout/AppLoading";
import PipelineColumn from "./PipelineColumn";
import PipelineFilters from "./PipelineFilters";
import PipelineBulkActions from "./PipelineBulkActions";
import { buildStageLabelMap, sortPipelineStages } from "./pipeline.types";
import { normalizeStageId } from "./pipeline.types";
import { usePipelineStore } from "./pipeline.store";
import { useSilo } from "@/core/SiloContext";
import { pipelineStages } from "@/pipeline/stages";
import { useAuth } from "@/hooks/useAuth";
import { canWrite } from "@/auth/can";
import { PipelineEngineContext } from "./PipelineEngineProvider";
const readFiltersFromParams = (params) => {
    const next = {};
    params.forEach((value, key) => {
        if (value)
            next[key] = value;
    });
    return next;
};
const buildSearchParams = (filters) => {
    const params = new URLSearchParams();
    if (filters.searchTerm)
        params.set("search", filters.searchTerm);
    if (filters.productCategory)
        params.set("productCategory", filters.productCategory);
    if (filters.stageId)
        params.set("stage", filters.stageId);
    if (filters.lenderAssigned)
        params.set("lenderAssigned", filters.lenderAssigned);
    if (filters.lenderStatus)
        params.set("lenderStatus", filters.lenderStatus);
    if (filters.processingStatus)
        params.set("processingStatus", filters.processingStatus);
    if (filters.submissionMethod)
        params.set("submissionMethod", filters.submissionMethod);
    if (filters.dateFrom)
        params.set("dateFrom", filters.dateFrom);
    if (filters.dateTo)
        params.set("dateTo", filters.dateTo);
    if (filters.sort)
        params.set("sort", filters.sort);
    return params;
};
const PipelinePage = () => {
    const config = useContext(PipelineEngineContext);
    if (!config)
        throw new Error("PipelineEngineProvider missing");
    const silo = useSilo();
    const stages = pipelineStages[silo];
    const navigate = useNavigate();
    const filters = usePipelineStore((state) => state.currentFilters);
    const selectedIds = usePipelineStore((state) => state.selectedApplicationIds);
    const resetPipeline = usePipelineStore((state) => state.resetPipeline);
    const setFilters = usePipelineStore((state) => state.setFilters);
    const toggleSelection = usePipelineStore((state) => state.toggleSelection);
    const clearSelection = usePipelineStore((state) => state.clearSelection);
    const [searchParams, setSearchParams] = useSearchParams();
    const initializedRef = useRef(false);
    const { user } = useAuth();
    const canEdit = canWrite(user?.role ?? null);
    const { data, isLoading, error } = useQuery({
        queryKey: ["pipeline", filters],
        queryFn: ({ signal }) => config.api.fetchPipeline(filters, { signal }),
        staleTime: 60_000,
        refetchOnWindowFocus: false,
        refetchInterval: 15_000
    });
    const orderedStages = useMemo(() => {
        const stageSet = new Set(stages.map((stage) => normalizeStageId(stage)));
        const filteredStages = (data?.stages ?? []).filter((stage) => stageSet.has(normalizeStageId(stage.id)));
        return sortPipelineStages(filteredStages);
    }, [data?.stages, stages]);
    const stageLabelMap = useMemo(() => buildStageLabelMap(orderedStages), [orderedStages]);
    const applications = data?.applications ?? [];
    const selectedCards = useMemo(() => applications.filter((application) => selectedIds.includes(application.id)), [applications, selectedIds]);
    useEffect(() => {
        if (initializedRef.current)
            return;
        const params = readFiltersFromParams(searchParams);
        setFilters({
            searchTerm: params.search ?? undefined,
            productCategory: params.productCategory ?? undefined,
            stageId: params.stage ?? undefined,
            lenderAssigned: params.lenderAssigned ?? undefined,
            lenderStatus: params.lenderStatus,
            processingStatus: params.processingStatus,
            submissionMethod: params.submissionMethod ?? undefined,
            dateFrom: params.dateFrom ?? undefined,
            dateTo: params.dateTo ?? undefined,
            sort: params.sort
        });
        initializedRef.current = true;
    }, [searchParams, setFilters]);
    useEffect(() => {
        const params = buildSearchParams(filters);
        const nextQuery = params.toString();
        if (nextQuery !== searchParams.toString()) {
            setSearchParams(params, { replace: true });
        }
    }, [filters, searchParams, setSearchParams]);
    useEffect(() => () => resetPipeline(), [resetPipeline]);
    const handleCardClick = (id) => {
        navigate(`/applications/${id}`);
    };
    const matchesLenderStatus = (application) => {
        if (!filters.lenderStatus)
            return true;
        const hasAssignedLender = Boolean(application.assignedLender);
        return filters.lenderStatus === "assigned" ? hasAssignedLender : !hasAssignedLender;
    };
    const sortStageApplications = (stageId) => {
        const stageApplications = applications.filter((application) => normalizeStageId(application.stage) === normalizeStageId(stageId) && matchesLenderStatus(application));
        const tieBreaker = (a, b) => a.id.localeCompare(b.id);
        switch (filters.sort) {
            case "updated_asc":
                return stageApplications.sort((a, b) => new Date(a.updatedAt ?? a.createdAt).getTime() -
                    new Date(b.updatedAt ?? b.createdAt).getTime() || tieBreaker(a, b));
            case "amount_desc":
                return stageApplications.sort((a, b) => {
                    const aAmount = a.requestedAmount ?? 0;
                    const bAmount = b.requestedAmount ?? 0;
                    return bAmount - aAmount || tieBreaker(a, b);
                });
            case "amount_asc":
                return stageApplications.sort((a, b) => {
                    const aAmount = a.requestedAmount ?? 0;
                    const bAmount = b.requestedAmount ?? 0;
                    return aAmount - bAmount || tieBreaker(a, b);
                });
            case "stage":
                return stageApplications.sort(tieBreaker);
            case "updated_desc":
            default:
                return stageApplications.sort((a, b) => new Date(b.updatedAt ?? b.createdAt).getTime() -
                    new Date(a.updatedAt ?? a.createdAt).getTime() || tieBreaker(a, b));
        }
    };
    return (_jsx("div", { className: "pipeline-page", children: _jsxs(Card, { title: "Application Pipeline", children: [_jsx(PipelineFilters, { stages: orderedStages }), canEdit ? (_jsx(PipelineBulkActions, { selectedCards: selectedCards, stages: orderedStages, onClearSelection: clearSelection })) : null, isLoading && _jsx(AppLoading, {}), error && _jsx(ErrorBanner, { message: "Unable to load the pipeline right now." }), _jsx("div", { className: "pipeline-columns", children: orderedStages.map((stage) => (_jsx(PipelineColumn, { stage: stage, stageLabel: stageLabelMap[stage.id] ?? stage.label, cards: sortStageApplications(stage.id), isLoading: isLoading, onCardClick: handleCardClick, selectedIds: selectedIds, selectable: canEdit, onSelectCard: toggleSelection }, stage.id))) })] }) }));
};
export default PipelinePage;
