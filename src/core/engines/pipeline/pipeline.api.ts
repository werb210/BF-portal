import { apiClient } from "@/api/httpClient";
import api from "@/lib/api";
import type { PipelineApplication, PipelineFilters, PipelineStage, PipelineStageId } from "./pipeline.types";
import type { BusinessUnit } from "@/types/businessUnit";
import { PIPELINE_STAGE_LABELS, PIPELINE_STAGE_ORDER, normalizeStageId } from "./pipeline.types";

const toTitleCase = (value: string) =>
  value
    .toLowerCase()
    .split(/[_\s]+/)
    .map((segment) => {
      if (!segment) return segment;
      const firstCharacter = segment[0];
      if (!firstCharacter) return segment;
      return firstCharacter.toUpperCase() + segment.slice(1);
    })
    .join(" ");

const STAGE_LABEL_OVERRIDES: Record<string, string> = {
  ...PIPELINE_STAGE_LABELS
};

const parseStage = (item: unknown): PipelineStage | null => {
  if (typeof item === "string") {
    const trimmed = item.trim();
    if (!trimmed) return null;
    const label = toTitleCase(trimmed);
    return { id: trimmed, label };
  }
  if (!item || typeof item !== "object") return null;
  const record = item as Record<string, unknown>;
  const id = typeof record.id === "string" ? record.id : typeof record.value === "string" ? record.value : "";
  if (!id) return null;
  const label =
    typeof record.label === "string"
      ? record.label
      : typeof record.name === "string"
        ? record.name
        : toTitleCase(id);
  const normalizedId = normalizeStageId(id);
  const description = typeof record.description === "string" ? record.description : undefined;
  const terminal = typeof record.terminal === "boolean" ? record.terminal : undefined;
  const order = typeof record.order === "number" ? record.order : undefined;
  const allowedTransitions = Array.isArray(record.allowedTransitions)
    ? record.allowedTransitions.filter((stageId) => typeof stageId === "string") as PipelineStageId[]
    : Array.isArray(record.nextStages)
      ? record.nextStages.filter((stageId) => typeof stageId === "string") as PipelineStageId[]
      : undefined;
  return {
    id,
    label: STAGE_LABEL_OVERRIDES[normalizedId] ?? label,
    description,
    terminal,
    allowedTransitions,
    order
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const parseStringArray = (value: unknown) =>
  Array.isArray(value) ? value.filter((item) => typeof item === "string") : undefined;

const asDisplayString = (value: unknown): string | undefined => {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
};

const resolveStage = (stage: unknown, status: unknown): string => {
  if (typeof stage === "string" && stage.trim().length > 0) {
    return stage;
  }
  if (status === "Pre-Application") {
    return "DRAFT";
  }
  return "";
};

const normalizePipelineApplication = (value: unknown): PipelineApplication | null => {
  if (!isRecord(value)) return null;
  const id =
    typeof value.id === "string"
      ? value.id
      : typeof value.application_id === "string"
        ? value.application_id
        : "";
  if (!id) return null;
  const createdAt =
    typeof value.createdAt === "string"
      ? value.createdAt
      : typeof value.created_at === "string"
        ? value.created_at
        : "";
  const updatedAt =
    typeof value.updatedAt === "string"
      ? value.updatedAt
      : typeof value.updated_at === "string"
        ? value.updated_at
        : typeof value.last_updated_at === "string"
          ? value.last_updated_at
          : typeof value.lastUpdatedAt === "string"
            ? value.lastUpdatedAt
            : undefined;
  const documents = isRecord(value.documents)
    ? {
        submitted:
          typeof value.documents.submitted === "number" ? value.documents.submitted : undefined,
        required:
          typeof value.documents.required === "number" ? value.documents.required : undefined
      }
    : {
        submitted:
          typeof value.documents_submitted === "number" ? value.documents_submitted : undefined,
        required:
          typeof value.documents_required === "number" ? value.documents_required : undefined
      };
  return {
    id,
    businessName:
      typeof value.businessName === "string"
        ? value.businessName
        : typeof value.business_name === "string"
          ? value.business_name
          : undefined,
    contactName:
      typeof value.contactName === "string"
        ? value.contactName
        : typeof value.contact_name === "string"
          ? value.contact_name
          : undefined,
    requestedAmount:
      typeof value.requestedAmount === "number"
        ? value.requestedAmount
        : typeof value.requested_amount === "number"
          ? value.requested_amount
          : undefined,
    productCategory:
      typeof value.productCategory === "string"
        ? value.productCategory
        : typeof value.product_category === "string"
          ? value.product_category
          : undefined,
    submissionMethod:
      typeof value.submissionMethod === "string"
        ? value.submissionMethod
        : typeof value.submission_method === "string"
          ? value.submission_method
          : undefined,
    source:
      typeof value.source === "string"
        ? value.source
        : typeof value.lead_source === "string"
          ? value.lead_source
          : undefined,
    stage: resolveStage(value.stage ?? value.current_stage, value.status),
    status: typeof value.status === "string" ? value.status : undefined,
    matchPercentage:
      typeof value.matchPercentage === "number" || typeof value.matchPercentage === "string"
        ? value.matchPercentage
        : typeof value.match_percentage === "number" || typeof value.match_percentage === "string"
          ? value.match_percentage
          : undefined,
    matchPercent:
      typeof value.matchPercent === "number" || typeof value.matchPercent === "string"
        ? value.matchPercent
        : typeof value.match_percent === "number" || typeof value.match_percent === "string"
          ? value.match_percent
          : undefined,
    matchScore:
      typeof value.matchScore === "number" || typeof value.matchScore === "string"
        ? value.matchScore
        : typeof value.match_score === "number" || typeof value.match_score === "string"
          ? value.match_score
          : undefined,
    documents,
    bankingComplete:
      typeof value.bankingComplete === "boolean"
        ? value.bankingComplete
        : typeof value.banking_complete === "boolean"
          ? value.banking_complete
          : undefined,
    ocrComplete:
      typeof value.ocrComplete === "boolean"
        ? value.ocrComplete
        : typeof value.ocr_complete === "boolean"
          ? value.ocr_complete
          : undefined,
    ocrMissingFields:
      parseStringArray(value.ocrMissingFields) ??
      parseStringArray(value.ocr_missing_fields) ??
      parseStringArray(value.missing_ocr_fields),
    ocrConflictCount:
      typeof value.ocrConflictCount === "number"
        ? value.ocrConflictCount
        : typeof value.ocr_conflict_count === "number"
          ? value.ocr_conflict_count
          : parseStringArray(value.ocrConflicts)?.length ??
            parseStringArray(value.ocr_conflicts)?.length ??
            parseStringArray(value.conflicting_ocr_fields)?.length,
    referrerId:
      typeof value.referrerId === "string"
        ? value.referrerId
        : typeof value.referrer_id === "string"
          ? value.referrer_id
          : undefined,
    referrerName:
      typeof value.referrerName === "string"
        ? value.referrerName
        : typeof value.referrer_name === "string"
          ? value.referrer_name
          : undefined,
    assignedStaff:
      typeof value.assignedStaff === "string"
        ? value.assignedStaff
        : typeof value.assigned_staff === "string"
          ? value.assigned_staff
          : undefined,
    assignedLender:
      typeof value.assignedLender === "string"
        ? value.assignedLender
        : typeof value.assigned_lender === "string"
          ? value.assigned_lender
          : undefined,
    industry: asDisplayString(value.industry),
    yearsInBusiness: asDisplayString(value.yearsInBusiness ?? value.years_in_business),
    annualRevenue: asDisplayString(value.annualRevenue ?? value.annual_revenue),
    monthlyRevenue: asDisplayString(value.monthlyRevenue ?? value.monthly_revenue),
    arBalance: asDisplayString(value.arBalance ?? value.accountsReceivable ?? value.accounts_receivable),
    collateral: asDisplayString(value.collateral ?? value.availableCollateral ?? value.available_collateral),
    createdAt,
    updatedAt
  };
};

const parsePipelineApplications = (data: unknown): PipelineApplication[] => {
  if (Array.isArray(data)) {
    return data
      .map((item) => normalizePipelineApplication(item))
      .filter((item): item is PipelineApplication => Boolean(item));
  }
  if (isRecord(data)) {
    const items = Array.isArray(data.items)
      ? data.items
      : Array.isArray((data as { data?: unknown }).data)
        ? (data as { data: unknown[] }).data
        : [];
    return items
      .map((item) => normalizePipelineApplication(item))
      .filter((item): item is PipelineApplication => Boolean(item));
  }
  return [];
};

const parsePipelineResponse = (data: unknown) => {
  if (Array.isArray(data)) {
    return { stages: [] as PipelineStage[], applications: parsePipelineApplications(data) };
  }
  if (!isRecord(data)) {
    return { stages: [] as PipelineStage[], applications: [] as PipelineApplication[] };
  }
  const rawStages = Array.isArray(data.stages)
    ? data.stages
    : Array.isArray(data.pipelineStages)
      ? data.pipelineStages
      : Array.isArray(data.stage)
        ? data.stage
        : [];
  const rawApplications = Array.isArray(data.applications)
    ? data.applications
    : Array.isArray(data.items)
      ? data.items
      : Array.isArray(data.data)
        ? data.data
        : [];
  return {
    stages: rawStages.map(parseStage).filter((stage): stage is PipelineStage => Boolean(stage)),
    applications: parsePipelineApplications(rawApplications)
  };
};

const buildLockedStages = (): PipelineStage[] =>
  PIPELINE_STAGE_ORDER.map((stageId) => ({
    id: stageId,
    label: PIPELINE_STAGE_LABELS[normalizeStageId(stageId)] ?? toTitleCase(stageId)
  }));

const buildPipelineQuery = (filters?: PipelineFilters) => {
  if (!filters) return "";
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
  const businessUnit = (filters as PipelineFilters & { businessUnit?: BusinessUnit }).businessUnit;
  if (businessUnit) params.set("business_unit", businessUnit);
  const query = params.toString();
  return query ? `?${query}` : "";
};

export const pipelineApi = {
  fetchPipeline: async (filters?: PipelineFilters, options?: { signal?: AbortSignal }) => {
    const res = await apiClient.get<unknown>(`/api/pipeline${buildPipelineQuery(filters)}`, options);
    const parsed = parsePipelineResponse(res);
    return {
      stages: parsed.stages.length ? parsed.stages : buildLockedStages(),
      applications: parsed.applications
    };
  },
  fetchStages: async (options?: { signal?: AbortSignal }) => {
    const { stages } = await pipelineApi.fetchPipeline(undefined, options);
    return stages;
  },
  fetchColumn: async (stage: PipelineStageId, filters: PipelineFilters, options?: { signal?: AbortSignal }) => {
    const { applications } = await pipelineApi.fetchPipeline(filters, options);
    const normalizedStage = normalizeStageId(stage);
    return applications.filter((application) => normalizeStageId(application.stage) === normalizedStage);
  },
  exportApplications: async (applicationIds: string[]) => {
    const response = await api.post(`/api/portal/applications/export`, { applicationIds }, { responseType: "blob" });
    return response.data as Blob;
  }
};

export type PipelineApi = typeof pipelineApi;
