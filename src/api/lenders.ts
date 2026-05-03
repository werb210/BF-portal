import { api, type RequestOptions } from "@/api";
import type {
  Lender,
  LenderPayload,
  LenderProduct,
  LenderProductPayload,
  LenderProductRequirement
} from "@/types/lenderManagement.models";
import { LENDER_PRODUCT_CATEGORIES, isLenderProductCategory, type RateType } from "@/types/lenderManagement.types";
import { logger } from "@/utils/logger";

type LenderStatus = "ACTIVE" | "INACTIVE";

type LenderSummary = {
  id: string;
  name?: string;
  status?: LenderStatus;
};

export type { Lender, LenderPayload, LenderProduct, LenderProductPayload, LenderProductRequirement };

export type LenderMatch = {
  id: string;
  lenderName: string;
  productName?: string;
  matchPercent?: number | string | null;
  matchPercentage?: number | string | null;
  matchScore?: number | string | null;
  productCategory?: string | null;
  terms?: string;
  requiredDocsStatus?: string;
  submissionMethod?: string | null;
  submission_method?: string | null;
  submissionConfig?: { method?: string | null };
  // BF_LENDERS_TAB_FIX_v55_PORTAL — funding range from
  // /api/applications/:id/lenders (BF-Server lenderMatchEngine).
  amountMin?: number | null;
  amountMax?: number | null;
};

export type LenderSubmissionStatus = "sent" | "failed" | "pending_manual";

export type LenderSubmission = {
  id: string;
  lenderProductId: string;
  status: LenderSubmissionStatus;
  transmissionId?: string | null;
  errorMessage?: string | null;
  updatedAt?: string | null;
  method?: string | null;
  externalReference?: string | null;
};

export type ClientLender = { id: string; name: string };
export type ClientLenderProduct = {
  id: string;
  name: string;
  product_type: string;
  min_amount: number | null;
  max_amount: number | null;
  lender_id: string;
  lender_name: string;
};

type LenderProductRequirementApi = {
  id: string;
  document_type: string;
  required: boolean;
  min_amount: number | null;
  max_amount: number | null;
};

type ClientRequirementResponse = {
  requirements?: LenderProductRequirementApi[];
  document_types?: string[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const ensureEntityHasId = <T extends { id?: string }>(
  entity: T | null | undefined,
  context: string,
  fallbackId?: string
): T & { id: string } => {
  const safeEntity = (entity ?? {}) as T;
  const rawId = typeof safeEntity.id === "string" ? safeEntity.id.trim() : "";
  if (!rawId) {
    logger.warn(`Expected ${context} response to include an id.`);
    return { ...safeEntity, id: fallbackId ?? "" } as T & { id: string };
  }
  return { ...safeEntity, id: rawId } as T & { id: string };
};

const parseLendersResponse = (data: unknown): LenderSummary[] => {
  if (Array.isArray(data)) {
    return data as LenderSummary[];
  }
  if (isRecord(data) && Array.isArray(data.items)) {
    return data.items as LenderSummary[];
  }
  return [];
};

const normalizeLenderStatus = (value: unknown): LenderStatus | undefined => {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toUpperCase();
  if (normalized === "ACTIVE" || normalized === "INACTIVE") return normalized;
  return undefined;
};

const normalizeRateType = (value: unknown): RateType => {
  if (typeof value !== "string") return "fixed";
  const normalized = value.trim().toLowerCase();
  if (normalized === "fixed" || normalized === "variable" || normalized === "factor") {
    return normalized as RateType;
  }
  return "fixed";
};

const normalizeLenderCountry = (value?: string | null) => {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) return "";
  const normalized = trimmed.toUpperCase();
  if (normalized === "CA" || normalized === "CANADA") return "CA";
  if (normalized === "US" || normalized === "USA" || normalized === "UNITED STATES") return "US";
  if (normalized === "BOTH") return "BOTH";
  return trimmed;
};

const parseListItems = <T>(data: unknown): T[] => {
  if (Array.isArray(data)) {
    return data as T[];
  }
  if (isRecord(data) && Array.isArray(data.items)) {
    return data.items as T[];
  }
  return [];
};

const normalizeInterestValue = (rateType: RateType, value: unknown): number | string => {
  if (rateType === "variable") {
    if (typeof value === "string") return value;
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    return "";
  }
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const numeric = Number(value);
    return Number.isNaN(numeric) ? 0 : numeric;
  }
  return 0;
};

const normalizeRequiredDocuments = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (typeof entry === "string") {
        return { category: entry, required: true, description: null };
      }
      if (!isRecord(entry)) return null;
      const category = typeof entry.category === "string" ? entry.category : "";
      if (!category) return null;
      return {
        category,
        required: typeof entry.required === "boolean" ? entry.required : true,
        description: typeof entry.description === "string" ? entry.description : null
      };
    })
    .filter((entry): entry is LenderProduct["requiredDocuments"][number] => Boolean(entry));
};

const normalizeLender = (raw: LenderSummary): Lender | null => {
  if (!raw?.id || typeof raw.id !== "string") return null;
  const record: Record<string, unknown> = isRecord(raw) ? raw : {};
  const lender = raw as Partial<Lender>;
  const status = normalizeLenderStatus(raw.status ?? lender.status ?? record.status);
  const activeValue =
    typeof lender.active === "boolean"
      ? lender.active
      : typeof record.active === "boolean"
        ? record.active
        : undefined;
  const resolvedStatus = status ?? (activeValue !== undefined ? (activeValue ? "ACTIVE" : "INACTIVE") : "INACTIVE");
  const active = activeValue ?? resolvedStatus === "ACTIVE";

  const rawCountry =
    typeof record.country === "string"
      ? record.country
      : isRecord(lender.address)
        ? lender.address.country
        : "";
  const address = isRecord(lender.address)
    ? {
        street: typeof lender.address.street === "string" ? lender.address.street : "",
        city: typeof lender.address.city === "string" ? lender.address.city : "",
        stateProvince:
          typeof lender.address.stateProvince === "string"
            ? lender.address.stateProvince
            : typeof record.region === "string"
              ? record.region
              : "",
        postalCode:
          typeof lender.address.postalCode === "string"
            ? lender.address.postalCode
            : "",
        country: normalizeLenderCountry(rawCountry)
      }
    : {
        street: typeof record.street === "string" ? record.street : "",
        city: typeof record.city === "string" ? record.city : "",
        stateProvince:
          typeof record.region === "string"
            ? record.region
            : typeof record.stateProvince === "string"
              ? record.stateProvince
              : "",
        postalCode:
          typeof record.postal_code === "string"
            ? record.postal_code
            : "",
        country: normalizeLenderCountry(rawCountry)
      };

  const primaryContact = isRecord(lender.primaryContact)
    ? {
        name: typeof lender.primaryContact.name === "string" ? lender.primaryContact.name : "",
        email: typeof lender.primaryContact.email === "string" ? lender.primaryContact.email : "",
        phone: typeof lender.primaryContact.phone === "string" ? lender.primaryContact.phone : "",
        mobilePhone:
          typeof lender.primaryContact.mobilePhone === "string"
            ? lender.primaryContact.mobilePhone
            : ""
      }
    : {
        name:
          typeof record.contact_name === "string"
            ? record.contact_name
            : typeof record.primary_contact_name === "string"
              ? record.primary_contact_name
              : "",
        email:
          typeof record.contact_email === "string"
            ? record.contact_email
            : typeof record.primary_contact_email === "string"
              ? record.primary_contact_email
              : "",
        phone:
          typeof record.contact_phone === "string"
            ? record.contact_phone
            : typeof record.primary_contact_phone === "string"
              ? record.primary_contact_phone
              : "",
        mobilePhone: ""
      };

  const submissionConfig = isRecord(lender.submissionConfig)
    ? {
        method:
          lender.submissionConfig.method === "API" ||
          lender.submissionConfig.method === "EMAIL" ||
          lender.submissionConfig.method === "GOOGLE_SHEET" ||
          lender.submissionConfig.method === "MANUAL"
            ? lender.submissionConfig.method
            : "MANUAL",
        sheetId: lender.submissionConfig.sheetId ?? null,
        worksheetName: lender.submissionConfig.worksheetName ?? null,
        mappingPreview: lender.submissionConfig.mappingPreview ?? null,
        sheetStatus: lender.submissionConfig.sheetStatus ?? null,
        attachmentFormat: lender.submissionConfig.attachmentFormat ?? null,
        apiAuthType: lender.submissionConfig.apiAuthType ?? null,
        apiBaseUrl: lender.submissionConfig.apiBaseUrl ?? null,
        apiClientId: lender.submissionConfig.apiClientId ?? null,
        apiUsername: lender.submissionConfig.apiUsername ?? null,
        apiPassword: lender.submissionConfig.apiPassword ?? null,
        submissionEmail: lender.submissionConfig.submissionEmail ?? null
      }
    : {
        method:
          typeof record.submission_method === "string" &&
          ["API", "EMAIL", "MANUAL", "GOOGLE_SHEET"].includes(record.submission_method)
            ? (record.submission_method as Lender["submissionConfig"]["method"])
            : "MANUAL",
        sheetId:
          typeof record.submission_sheet_id === "string"
            ? record.submission_sheet_id
            : null,
        worksheetName:
          typeof record.submission_worksheet_name === "string"
            ? record.submission_worksheet_name
            : null,
        mappingPreview:
          typeof record.submission_mapping_preview === "string"
            ? record.submission_mapping_preview
            : null,
        sheetStatus:
          typeof record.submission_sheet_status === "string"
            ? record.submission_sheet_status
            : null,
        attachmentFormat:
          typeof record.submission_attachment_format === "string"
            ? (record.submission_attachment_format as "PDF" | "CSV")
            : null,
        apiAuthType:
          typeof record.submission_api_auth_type === "string"
            ? (record.submission_api_auth_type as "token" | "key")
            : null,
        apiBaseUrl:
          typeof record.submission_api_endpoint === "string"
            ? record.submission_api_endpoint
            : null,
        apiClientId: null,
        apiUsername: null,
        apiPassword: null,
        submissionEmail:
          typeof record.submission_email === "string"
            ? record.submission_email
            : null
      };

  const operationalLimits = isRecord((raw as Lender).operationalLimits)
    ? {
        maxLendingLimit: (raw as Lender).operationalLimits.maxLendingLimit ?? null,
        maxLtv: (raw as Lender).operationalLimits.maxLtv ?? null,
        maxLoanTerm: (raw as Lender).operationalLimits.maxLoanTerm ?? null,
        maxAmortization: (raw as Lender).operationalLimits.maxAmortization ?? null
      }
    : {
        maxLendingLimit: null,
        maxLtv: null,
        maxLoanTerm: null,
        maxAmortization: null
      };

  return {
    id: raw.id,
    name: typeof raw.name === "string" ? raw.name : "",
    active,
    status: resolvedStatus,
    address,
    phone: typeof lender.phone === "string" ? lender.phone : "",
    website: typeof lender.website === "string" ? lender.website : null,
    description: typeof lender.description === "string" ? lender.description : null,
    internalNotes:
      typeof lender.internalNotes === "string"
        ? lender.internalNotes
        : typeof record.internal_notes === "string"
          ? record.internal_notes
          : null,
    processingNotes: typeof lender.processingNotes === "string" ? lender.processingNotes : null,
    primaryContact,
    submissionConfig,
    operationalLimits
  };
};

const normalizeLenderProduct = (raw: unknown): LenderProduct | null => {
  if (!isRecord(raw)) return null;
  const id = typeof raw.id === "string" ? raw.id : "";
  if (!id) return null;
  const lenderId =
    typeof raw.lenderId === "string"
      ? raw.lenderId
      : typeof raw.lender_id === "string"
        ? raw.lender_id
        : "";
  const productName =
    typeof raw.productName === "string"
      ? raw.productName
      : typeof raw.product_name === "string"
        ? raw.product_name
        : typeof raw.name === "string"
          ? raw.name
          : "";
  const active = typeof raw.active === "boolean" ? raw.active : true;
  // BF_PORTAL_BLOCK_v86_ROUTING_DRAWER_CATEGORIES_TOPBAR_v1
  // Server stores SHORT categories per migration
  // 2026_05_03_lender_categories_and_closing_costs.sql:
  //   TERM, LOC, EQUIPMENT, FACTORING, PO, MCA, MEDIA, ABL, SBA, STARTUP
  // Portal LENDER_PRODUCT_CATEGORIES uses LONG forms. Without this map
  // every product fell back to LENDER_PRODUCT_CATEGORIES[0] = TERM_LOAN
  // and the LenderProductsPage rendered every product under "Term Loan".
  const SERVER_CATEGORY_TO_PORTAL: Record<string, string> = {
    TERM: "TERM_LOAN",
    LOC: "LINE_OF_CREDIT",
    EQUIPMENT: "EQUIPMENT_FINANCE",
    FACTORING: "FACTORING",
    PO: "PURCHASE_ORDER_FINANCE",
    MCA: "MERCHANT_CASH_ADVANCE",
    ABL: "ASSET_BASED_LENDING",
    SBA: "SBA_GOVERNMENT",
    STARTUP: "STARTUP_CAPITAL",
    MEDIA: "MEDIA",
  };
  const rawCategory =
    typeof raw.category === "string"
      ? raw.category
      : typeof raw.product_category === "string"
        ? raw.product_category
        : "";
  const upperCategory = rawCategory.trim().toUpperCase();
  const mappedCategory = SERVER_CATEGORY_TO_PORTAL[upperCategory] ?? upperCategory;
  const category = isLenderProductCategory(mappedCategory)
    ? mappedCategory
    : LENDER_PRODUCT_CATEGORIES[0];
  const country = normalizeLenderCountry(typeof raw.country === "string" ? raw.country : "") as LenderProduct["country"];
  const currency =
    typeof raw.currency === "string"
      ? raw.currency
      : country === "CA"
        ? "CAD"
        : country === "US"
          ? "USD"
          : "CAD/USD";
  const rateType = normalizeRateType(raw.rateType ?? raw.rate_type ?? raw.interest_type);
  // BF_LP_NORMALIZE_v32 — server returns snake_case columns directly from
  // Postgres (amount_min/amount_max/interest_min/interest_max/term_min/term_max/term_unit)
  // plus a BF_LP_FIELDS_v32 camelCase decoration layer. Read both, in that order.
  const minAmount = typeof raw.minAmount === "number"
    ? raw.minAmount
    : Number(raw.amount_min ?? raw.min_amount ?? raw.amountMin ?? 0);
  const maxAmount = typeof raw.maxAmount === "number"
    ? raw.maxAmount
    : Number(raw.amount_max ?? raw.max_amount ?? raw.amountMax ?? 0);
  const interestRateMin = normalizeInterestValue(rateType, raw.interestRateMin ?? raw.interest_min ?? raw.interestMin);
  const interestRateMax = normalizeInterestValue(rateType, raw.interestRateMax ?? raw.interest_max ?? raw.interestMax);
  const termLength = isRecord(raw.termLength)
    ? {
        min: typeof raw.termLength.min === "number" ? raw.termLength.min : Number(raw.termLength.min ?? 0),
        max: typeof raw.termLength.max === "number" ? raw.termLength.max : Number(raw.termLength.max ?? 0),
        unit: typeof raw.termLength.unit === "string" ? raw.termLength.unit.toLowerCase() : "months"
      }
    : {
        min: Number(raw.term_min ?? raw.termMin ?? raw.term_min_months ?? 0),
        max: Number(raw.term_max ?? raw.termMax ?? raw.term_max_months ?? 0),
        unit: typeof raw.term_unit === "string" ? String(raw.term_unit).toLowerCase() : "months"
      };
  const eligibilityFlags = isRecord(raw.eligibilityFlags)
    ? {
        minimumRevenue:
          typeof raw.eligibilityFlags.minimumRevenue === "number" ? raw.eligibilityFlags.minimumRevenue : null,
        timeInBusinessMonths:
          typeof raw.eligibilityFlags.timeInBusinessMonths === "number"
            ? raw.eligibilityFlags.timeInBusinessMonths
            : null,
        industryRestrictions:
          typeof raw.eligibilityFlags.industryRestrictions === "string"
            ? raw.eligibilityFlags.industryRestrictions
            : null
      }
    : {
        minimumRevenue: null,
        timeInBusinessMonths: null,
        industryRestrictions: null
      };
  const requiredDocuments = normalizeRequiredDocuments(raw.requiredDocuments ?? raw.required_documents);

  return {
    id,
    lenderId,
    productName,
    active,
    category,
    country: country || "US",
    currency,
    minAmount: Number.isNaN(minAmount) ? 0 : minAmount,
    maxAmount: Number.isNaN(maxAmount) ? 0 : maxAmount,
    interestRateMin,
    interestRateMax,
    rateType,
    termLength: {
      min: Number.isNaN(termLength.min) ? 0 : termLength.min,
      max: Number.isNaN(termLength.max) ? 0 : termLength.max,
      unit: termLength.unit === "years" || termLength.unit === "months" ? termLength.unit : "months"
    },
    fees: typeof raw.fees === "string" ? raw.fees : null,
    minimumCreditScore: typeof raw.minimumCreditScore === "number" ? raw.minimumCreditScore : null,
    ltv: typeof raw.ltv === "number" ? raw.ltv : null,
    // BF_LP_NORMALIZE_v32 — read snake_case fallbacks for fields the server stores raw.
    eligibilityRules:
      typeof raw.eligibilityRules === "string" ? raw.eligibilityRules :
      typeof raw.eligibility_notes === "string" ? raw.eligibility_notes :
      typeof raw.eligibilityNotes === "string" ? raw.eligibilityNotes : null,
    eligibilityFlags,
    requiredDocuments,
    signnowTemplateId:
      typeof raw.signnowTemplateId === "string" ? raw.signnowTemplateId :
      typeof raw.signnow_template_id === "string" ? raw.signnow_template_id : null,
    // BF_LP_FORM_FIELDS_v36
    commission:
      raw.commission != null
        ? Number(raw.commission)
        : raw.commissionPercent != null
          ? Number(raw.commissionPercent)
          : null,
    commissionPercent:
      raw.commission != null
        ? Number(raw.commission)
        : raw.commissionPercent != null
          ? Number(raw.commissionPercent)
          : null,
    minCreditScore:
      raw.min_credit_score != null
        ? Number(raw.min_credit_score)
        : raw.minCreditScore != null
          ? Number(raw.minCreditScore)
          : null,
    termMin:
      raw.term_min != null
        ? Number(raw.term_min)
        : raw.termMin != null
          ? Number(raw.termMin)
          : null,
    termMax:
      raw.term_max != null
        ? Number(raw.term_max)
        : raw.termMax != null
          ? Number(raw.termMax)
          : null
  } as LenderProduct;
};

export const fetchLenders = async (options?: RequestOptions) => {
  const res = await api.get<unknown>("/api/portal/lenders", options);
  const lenders = parseLendersResponse(res)
    .map((item) => normalizeLender(item))
    .filter((item): item is Lender => Boolean(item));
  return lenders;
};

export const fetchLenderById = async (id: string) => {
  const lender = await api.get<unknown>(`/api/portal/lenders/${id}`);
  const normalized = normalizeLender(ensureEntityHasId((lender ?? {}) as LenderSummary, "lender", id));
  return ensureEntityHasId(normalized ?? (lender as Lender), "lender", id);
};

export const createLender = async (payload: LenderPayload) => {
  const lender = await api.post<unknown>(`/api/portal/lenders`, payload);
  const normalized = normalizeLender(ensureEntityHasId((lender ?? {}) as LenderSummary, "lender"));
  return ensureEntityHasId(normalized ?? (lender as Lender), "lender");
};

export const updateLender = async (id: string, payload: Partial<LenderPayload>) => {
  const lender = await api.patch<unknown>(`/api/portal/lenders/${id}`, payload);
  const normalized = normalizeLender(ensureEntityHasId((lender ?? {}) as LenderSummary, "lender", id));
  return ensureEntityHasId(normalized ?? (lender as Lender), "lender", id);
};

export const fetchLenderProducts = async (lenderId?: string, options?: RequestOptions) => {
  const res = await api.get<unknown>(`/api/portal/lender-products`, {
    params: lenderId ? { lenderId } : undefined,
    ...options
  });
  const items = parseListItems<unknown>(res);
  return items
    .map((item) => normalizeLenderProduct(item))
    .filter((item): item is LenderProduct => Boolean(item));
};

export const fetchLenderProductById = async (productId: string) => {
  const product = await api.get<unknown>(`/api/portal/lender-products/${productId}`);
  const normalized = normalizeLenderProduct(ensureEntityHasId((product ?? {}) as { id?: string }, "lender product", productId));
  return ensureEntityHasId(normalized ?? (product as LenderProduct), "lender product", productId);
};

export const createLenderProduct = async (payload: LenderProductPayload) => {
  const product = await api.post<unknown>(`/api/portal/lender-products`, payload);
  const normalized = normalizeLenderProduct(ensureEntityHasId((product ?? {}) as { id?: string }, "lender product"));
  return ensureEntityHasId(normalized ?? (product as LenderProduct), "lender product");
};

export const updateLenderProduct = async (productId: string, payload: Partial<LenderProductPayload>) => {
  const product = await api.put<unknown>(`/api/portal/lender-products/${productId}`, payload);
  const normalized = normalizeLenderProduct(ensureEntityHasId((product ?? {}) as { id?: string }, "lender product", productId));
  return ensureEntityHasId(normalized ?? (product as LenderProduct), "lender product", productId);
};

// BF_LENDERS_API_PATH_v42 — Block 42-B — was missing /api/ prefix; never hit server.
export const fetchLenderMatches = (applicationId: string, options?: RequestOptions) =>
  api.get<LenderMatch[]>(`/api/applications/${applicationId}/lenders`, options);

export const createLenderSubmission = (applicationId: string, lenderProductIds: string[]) =>
  api.post(`/api/portal/lender-submissions`, { applicationId, lenderProductIds });

export const fetchLenderSubmissions = (applicationId: string, options?: RequestOptions) =>
  api.get<LenderSubmission[]>(`/api/portal/lender-submissions`, {
    ...options,
    params: { applicationId, ...(options?.params ?? {}) }
  });

export const retryLenderSubmission = (applicationId: string, lenderProductId?: string) =>
  api.post(`/api/portal/lender-submissions/${applicationId}/submit`, lenderProductId ? { lenderProductId } : undefined);

export const retryLenderTransmission = async (_transmissionId: string) => null;

export async function fetchClientLenders(): Promise<ClientLender[]> {
  const payload = await api.get<unknown>("/api/portal/lenders");
  const normalized = (payload as { data?: unknown }).data ?? payload;
  if (Array.isArray(normalized)) {
    return normalized as ClientLender[];
  }
  if (normalized && typeof normalized === "object" && Array.isArray((normalized as { items?: unknown }).items)) {
    return (normalized as { items: ClientLender[] }).items;
  }
  return [];
}

export async function fetchClientLenderProducts(): Promise<ClientLenderProduct[]> {
  const payload = await api.get<unknown>("/api/portal/lender-products");
  const normalized = (payload as { data?: unknown }).data ?? payload;
  if (Array.isArray(normalized)) {
    return normalized as ClientLenderProduct[];
  }
  if (normalized && typeof normalized === "object" && Array.isArray((normalized as { items?: unknown }).items)) {
    return (normalized as { items: ClientLenderProduct[] }).items;
  }
  return [];
}

const normalizeRequirement = (requirement: LenderProductRequirementApi): LenderProductRequirement => ({
  id: requirement.id,
  documentType: requirement.document_type ?? "",
  required: Boolean(requirement.required),
  minAmount: requirement.min_amount ?? null,
  maxAmount: requirement.max_amount ?? null
});

const parseRequirementResponse = (data: unknown) => {
  if (Array.isArray(data)) {
    return { requirements: data as LenderProductRequirementApi[] };
  }
  if (isRecord(data)) {
    const requirements = Array.isArray((data as ClientRequirementResponse).requirements)
      ? ((data as ClientRequirementResponse).requirements as LenderProductRequirementApi[])
      : Array.isArray((data as { items?: unknown }).items)
        ? ((data as { items: LenderProductRequirementApi[] }).items ?? [])
        : [];
    const documentTypes = Array.isArray((data as ClientRequirementResponse).document_types)
      ? ((data as ClientRequirementResponse).document_types as string[])
      : undefined;
    return { requirements, documentTypes };
  }
  return { requirements: [] as LenderProductRequirementApi[] };
};

export async function fetchClientLenderProductRequirements(productId: string) {
  const payload = await api.get<unknown>(`/api/portal/lender-products/${productId}/requirements`);
  const normalized = (payload as { data?: unknown }).data ?? payload;
  const parsed = parseRequirementResponse(normalized);
  return {
    requirements: parsed.requirements.map(normalizeRequirement),
    documentTypes: parsed.documentTypes
  };
}

export const createLenderProductRequirement = async (
  productId: string,
  payload: Omit<LenderProductRequirementApi, "id">
) => {
  const requirement = await api.post<LenderProductRequirementApi>(
    `/api/portal/lender-products/${productId}/requirements`,
    payload
  );
  return normalizeRequirement(ensureEntityHasId(requirement, "requirement"));
};

export const updateLenderProductRequirement = async (
  productId: string,
  requirementId: string,
  payload: Omit<LenderProductRequirementApi, "id">
) => {
  const requirement = await api.put<LenderProductRequirementApi>(
    `/api/portal/lender-products/${productId}/requirements/${requirementId}`,
    payload
  );
  return normalizeRequirement(ensureEntityHasId(requirement, "requirement", requirementId));
};

export const deleteLenderProductRequirement = (productId: string, requirementId: string) =>
  api.delete(`/api/portal/lender-products/${productId}/requirements/${requirementId}`);
