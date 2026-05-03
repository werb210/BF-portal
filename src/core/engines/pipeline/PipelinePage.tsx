import { useContext, useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import Card from "@/components/ui/Card";
import ErrorBanner from "@/components/ui/ErrorBanner";
import AppLoading from "@/components/layout/AppLoading";
import PipelineColumn from "./PipelineColumn";
import PipelineFilters from "./PipelineFilters";
import PipelineBulkActions from "./PipelineBulkActions";
import {
  buildStageLabelMap,
  sortPipelineStages,
  type PipelineFilters as PipelineFiltersState
} from "./pipeline.types";
import { normalizeStageId } from "./pipeline.types";
import { usePipelineStore } from "./pipeline.store";
// BF_PORTAL_BLOCK_v86_ROUTING_DRAWER_CATEGORIES_TOPBAR_v1
// @/core/SiloContext reads from window.location.host via getSiloFromHost().
// It is NOT updated when the user changes silo in the topbar. The new
// BusinessUnitContext + @/context/SiloContext facade is the canonical
// silo state. PipelinePage was the last consumer of the legacy host-based
// hook and was the source of the iPad-reported "topbar shows BF, left
// rail shows BI" mismatch. Note: useSilo() from @/hooks/useSilo returns
// the new shape { silo, setSilo } — make sure usages destructure it.
import { useSilo } from "@/hooks/useSilo";
import { pipelineStages } from "@/pipeline/stages";
import { useAuth } from "@/hooks/useAuth";
import { canWrite } from "@/auth/can";
import { PipelineEngineContext } from "./PipelineEngineProvider";

const readFiltersFromParams = (params: URLSearchParams) => {
  const next: Record<string, string> = {};
  params.forEach((value, key) => {
    if (value) next[key] = value;
  });
  return next;
};

const buildSearchParams = (filters: PipelineFiltersState) => {
  const params = new URLSearchParams();
  if (filters.searchTerm) params.set("search", filters.searchTerm);
  if (filters.productCategory) params.set("productCategory", filters.productCategory);
  if (filters.stageId) params.set("stage", filters.stageId);
  if (filters.lenderAssigned) params.set("lenderAssigned", filters.lenderAssigned);
  if (filters.lenderStatus) params.set("lenderStatus", filters.lenderStatus);
  if (filters.processingStatus) params.set("processingStatus", filters.processingStatus);
  if (filters.submissionMethod) params.set("submissionMethod", filters.submissionMethod);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.sort) params.set("sort", filters.sort);
  return params;
};

const PipelinePage = () => {
  const config = useContext(PipelineEngineContext);
  if (!config) throw new Error("PipelineEngineProvider missing");

  // BF_PORTAL_BLOCK_v86b_PIPELINEPAGE_USESILO_DESTRUCTURE_v2
  // useSilo() now returns { silo, setSilo } via the BusinessUnitContext
  // facade. Inner silo is lowercase ("bf"|"bi"|"slf"); pipelineStages
  // is keyed by uppercase Silo ("BF"|"BI"|"SLF"). Mirror the case-up
  // pattern from AppLayout.tsx so pipelineStages indexing type-checks
  // and the downstream (stage) callback infers `string` instead of any.
  const { silo: rawSilo } = useSilo();
  const silo = (rawSilo ?? "bf").toUpperCase() as "BF" | "BI" | "SLF";
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
  const canEdit = canWrite((user as { role?: string | null } | null)?.role ?? null);

  const {
    data,
    isLoading,
    error
  } = useQuery({
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

  const selectedCards = useMemo(
    () => applications.filter((application) => selectedIds.includes(application.id)),
    [applications, selectedIds]
  );

  useEffect(() => {
    if (initializedRef.current) return;
    const params = readFiltersFromParams(searchParams);
    setFilters({
      searchTerm: params.search ?? undefined,
      productCategory: params.productCategory ?? undefined,
      stageId: params.stage ?? undefined,
      lenderAssigned: params.lenderAssigned ?? undefined,
      lenderStatus: params.lenderStatus as typeof filters.lenderStatus | undefined,
      processingStatus: params.processingStatus as typeof filters.processingStatus | undefined,
      submissionMethod: params.submissionMethod ?? undefined,
      dateFrom: params.dateFrom ?? undefined,
      dateTo: params.dateTo ?? undefined,
      sort: params.sort as typeof filters.sort | undefined
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


  const handleCardClick = (id: string) => {
    navigate(`/applications/${id}`);
  };

  const matchesLenderStatus = (application: (typeof applications)[number]) => {
    if (!filters.lenderStatus) return true;
    const hasAssignedLender = Boolean(application.assignedLender);
    return filters.lenderStatus === "assigned" ? hasAssignedLender : !hasAssignedLender;
  };

  const sortStageApplications = (stageId: string) => {
    const stageApplications = applications.filter(
      (application) =>
        normalizeStageId(application.stage) === normalizeStageId(stageId) && matchesLenderStatus(application)
    );
    const tieBreaker = (a: (typeof stageApplications)[number], b: (typeof stageApplications)[number]) =>
      a.id.localeCompare(b.id);
    switch (filters.sort) {
      case "updated_asc":
        return stageApplications.sort(
          (a, b) =>
            new Date(a.updatedAt ?? a.createdAt).getTime() -
              new Date(b.updatedAt ?? b.createdAt).getTime() || tieBreaker(a, b)
        );
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
        return stageApplications.sort(
          (a, b) =>
            new Date(b.updatedAt ?? b.createdAt).getTime() -
              new Date(a.updatedAt ?? a.createdAt).getTime() || tieBreaker(a, b)
        );
    }
  };

  return (
    <div className="pipeline-page">
      <Card title="Application Pipeline">
        <PipelineFilters stages={orderedStages} />
        {canEdit ? (
          <PipelineBulkActions
            selectedCards={selectedCards}
            stages={orderedStages}
            onClearSelection={clearSelection}
          />
        ) : null}
        {isLoading && <AppLoading />}
        {error && <ErrorBanner message="Unable to load the pipeline right now." />}
        <div className="pipeline-columns">
          {orderedStages.map((stage) => (
            <PipelineColumn
              key={stage.id}
              stage={stage}
              stageLabel={stageLabelMap[stage.id] ?? stage.label}
              cards={sortStageApplications(stage.id)}
              isLoading={isLoading}
              onCardClick={handleCardClick}
              selectedIds={selectedIds}
              selectable={canEdit}
              onSelectCard={toggleSelection}
            />
          ))}
        </div>
      </Card>
    </div>
  );
};

export default PipelinePage;
