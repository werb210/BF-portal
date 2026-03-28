import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import ErrorBanner from "@/components/ui/ErrorBanner";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import Table from "@/components/ui/Table";
import AppLoading from "@/components/layout/AppLoading";
import RequireRole from "@/components/auth/RequireRole";
import ActionGate from "@/components/auth/ActionGate";
import { useAuthorization } from "@/hooks/useAuthorization";
import ErrorBoundary from "@/components/ErrorBoundary";
import LenderProductModal, { type ProductFormValues } from "@/components/LenderProductModal";
import GoogleSheetMappingEditor, {
  createEmptyMappingRow,
  type SheetMappingRow
} from "@/components/lenders/GoogleSheetMappingEditor";
import {
  createLender,
  createLenderProduct,
  fetchLenderById,
  fetchLenderProducts,
  fetchLenders,
  updateLender,
  updateLenderProduct,
  type Lender,
  type LenderPayload,
  type LenderProduct,
  type LenderProductPayload
} from "@/api/lenders";
import { ApiError } from "@/lib/api";
import { getErrorMessage } from "@/utils/errors";
import { getRequestId } from "@/utils/requestId";
import { emitUiTelemetry } from "@/utils/uiTelemetry";
import { SUBMISSION_METHODS, type SubmissionMethod } from "@/types/lenderManagement.types";
import { SUBMISSION_METHOD_LABELS, getSubmissionMethodBadgeTone, getSubmissionMethodLabel } from "@/utils/submissionMethods";
import {
  LENDER_PRODUCT_CATEGORIES,
  LENDER_PRODUCT_CATEGORY_LABELS,
  type LenderProductCategory,
  type RateType
} from "@/types/lenderManagement.types";
import {
  PRODUCT_DOCUMENT_OPTIONS,
  buildRequiredDocumentsPayload,
  deriveCurrency,
  deriveProductName,
  formatInterestPayload,
  getDefaultRequiredDocuments,
  getRateDefaults,
  isValidVariableRate,
  mapRequiredDocumentsToValues,
  normalizeCountrySelection,
  splitCountrySelection,
  normalizeInterestInput,
  resolveRateType
} from "./lenderProductForm";

type LenderFormValues = {
  name: string;
  active: boolean;
  country: string;
  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactPhone: string;
  website: string;
  internalNotes: string;
  submissionMethod: SubmissionMethod;
  submissionEmail: string;
  submissionAttachmentFormat: "PDF" | "CSV";
  submissionSheetId: string;
  submissionWorksheetName: string;
  submissionMappingPreview: string;
  submissionMappings: SheetMappingRow[];
  submissionSheetStatus: string;
  submissionApiEndpoint: string;
  submissionApiAuthType: "token" | "key";
};

const REQUIRED_IDENTIFIER_FIELDS = new Set(["business.legal_name", "owner.email"]);

const createEmptyLenderForm = (): LenderFormValues => ({
  name: "",
  active: true,
  country: "CA",
  primaryContactName: "",
  primaryContactEmail: "",
  primaryContactPhone: "",
  website: "",
  internalNotes: "",
  submissionMethod: "EMAIL",
  submissionEmail: "",
  submissionAttachmentFormat: "PDF",
  submissionSheetId: "",
  submissionWorksheetName: "",
  submissionMappingPreview: "",
  submissionMappings: [createEmptyMappingRow()],
  submissionSheetStatus: "",
  submissionApiEndpoint: "",
  submissionApiAuthType: "token"
});

const emptyProductForm = (lenderId: string): ProductFormValues => ({
  lenderId,
  active: true,
  productName: deriveProductName(LENDER_PRODUCT_CATEGORIES[0]),
  category: LENDER_PRODUCT_CATEGORIES[0],
  country: [],
  minAmount: "",
  maxAmount: "",
  minTerm: "",
  maxTerm: "",
  rateType: "fixed",
  interestMin: "",
  interestMax: "",
  fees: "",
  requiredDocuments: getDefaultRequiredDocuments()
});

const isValidEmail = (value: string) => value.includes("@");

const getApiErrorStatus = (error: unknown) => {
  if (error instanceof ApiError) {
    return error.status;
  }
  if (error && typeof error === "object" && "status" in error) {
    const status = (error as { status?: unknown }).status;
    return typeof status === "number" ? status : undefined;
  }
  return undefined;
};

const getApiErrorDetails = (error: unknown) => {
  if (error instanceof ApiError) return error.details;
  if (error && typeof error === "object" && "details" in error) {
    return (error as { details?: unknown }).details;
  }
  return undefined;
};

const extractValidationErrors = (error: unknown, fieldMap: Record<string, string>) => {
  const status = getApiErrorStatus(error);
  if (status !== 400 && status !== 422) return null;
  const details = getApiErrorDetails(error);
  if (!details || typeof details !== "object") return {};
  const rawErrors =
    (details as { errors?: Record<string, unknown> }).errors ??
    (details as { fieldErrors?: Record<string, unknown> }).fieldErrors ??
    (details as { fields?: Record<string, unknown> }).fields ??
    details;
  if (!rawErrors || typeof rawErrors !== "object") return {};
  const nextErrors: Record<string, string> = {};
  Object.entries(rawErrors as Record<string, unknown>).forEach(([key, value]) => {
    const mappedKey = fieldMap[key] ?? fieldMap[key.toLowerCase()] ?? key;
    const message = Array.isArray(value)
      ? value
          .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
          .join(", ")
      : typeof value === "string"
        ? value
        : typeof value === "object" && value && "message" in value
          ? String((value as { message?: unknown }).message ?? "")
          : "";
    if (mappedKey && message) {
      nextErrors[mappedKey] = message;
    }
  });
  return nextErrors;
};

const COUNTRIES = [
  { value: "CA", label: "Canada" },
  { value: "US", label: "United States" },
  { value: "BOTH", label: "Both" }
];

const normalizeLenderCountryValue = (value?: string | null) => {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) return "";
  const normalized = trimmed.toUpperCase();
  if (normalized === "CA" || normalized === "CANADA") return "CA";
  if (normalized === "US" || normalized === "USA" || normalized === "UNITED STATES") return "US";
  if (normalized === "BOTH") return "BOTH";
  return trimmed;
};

const formatLenderCountryLabel = (value?: string | null) => {
  const normalized = normalizeLenderCountryValue(value);
  if (!normalized) return "";
  return COUNTRIES.find((country) => country.value === normalized)?.label ?? value ?? "";
};

const toFormString = (value?: number | string | null) => {
  if (value === null || value === undefined) return "";
  return String(value);
};

const toOptionalTrim = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const formatRateType = (value: RateType) => value.charAt(0).toUpperCase() + value.slice(1);

const normalizeSheetStatus = (value?: string) => {
  const trimmed = value?.trim();
  if (!trimmed) return "";
  return trimmed.toUpperCase();
};

const getSheetStatusBadge = (value?: string) => {
  const normalized = normalizeSheetStatus(value);
  if (normalized === "CONNECTED") return { label: "Connected", tone: "sent" };
  if (normalized === "ERROR") return { label: "Error", tone: "failed" };
  if (normalized) return { label: value ?? "Unknown", tone: "pending" };
  return { label: "Not connected", tone: "idle" };
};

const parseMappingPreview = (preview?: string | null): SheetMappingRow[] => {
  if (!preview) return [createEmptyMappingRow()];
  try {
    const parsed = JSON.parse(preview) as { column?: string; field?: string }[];
    if (!Array.isArray(parsed)) return [createEmptyMappingRow()];
    const rows = parsed
      .filter((entry) => entry && (entry.column || entry.field))
      .map((entry) => ({
        id: createEmptyMappingRow().id,
        columnName: entry.column ?? "",
        systemField: entry.field ?? ""
      }));
    return rows.length ? rows : [createEmptyMappingRow()];
  } catch {
    return [createEmptyMappingRow()];
  }
};

const buildMappingPreview = (rows: SheetMappingRow[]) => {
  const mapped = rows
    .map((row) => ({ column: row.columnName.trim(), field: row.systemField.trim() }))
    .filter((row) => row.column || row.field);
  if (!mapped.length) return "";
  return JSON.stringify(mapped, null, 2);
};

const validateSheetMappings = (rows: SheetMappingRow[]) => {
  const normalizedRows = rows.map((row) => ({
    columnName: row.columnName.trim(),
    systemField: row.systemField.trim()
  }));
  if (!normalizedRows.length) {
    return "At least one column mapping is required.";
  }
  if (normalizedRows.some((row) => !row.columnName || !row.systemField)) {
    return "All mappings must include a sheet column and a system field.";
  }
  const columnNames = normalizedRows.map((row) => row.columnName.toLowerCase());
  const uniqueColumns = new Set(columnNames);
  if (uniqueColumns.size !== columnNames.length) {
    return "Sheet column names must be unique.";
  }
  const hasIdentifier = normalizedRows.some((row) => REQUIRED_IDENTIFIER_FIELDS.has(row.systemField));
  if (!hasIdentifier) {
    return "Map Business Name or Owner Email as an identifier.";
  }
  return null;
};

const PORTAL_PRODUCT_CATEGORIES = [
  "LINE_OF_CREDIT",
  "TERM_LOAN",
  "EQUIPMENT_FINANCE",
  "FACTORING",
  "PURCHASE_ORDER_FINANCE"
] as const;

type PortalProductCategory = (typeof PORTAL_PRODUCT_CATEGORIES)[number] | "STARTUP_CAPITAL";

const PORTAL_PRODUCT_CATEGORY_LABELS: Record<PortalProductCategory, string> = {
  LINE_OF_CREDIT: "Line of Credit",
  TERM_LOAN: "Term Loan",
  EQUIPMENT_FINANCE: "Equipment Financing",
  FACTORING: "Factoring",
  PURCHASE_ORDER_FINANCE: "Purchase Order Financing",
  STARTUP_CAPITAL: "Startup Financing"
};

const isPortalProductCategory = (value: LenderProductCategory): value is PortalProductCategory =>
  value === "STARTUP_CAPITAL" || (PORTAL_PRODUCT_CATEGORIES as readonly string[]).includes(value);

const getLenderStatus = (lender?: Lender | null) => {
  if (!lender) return "INACTIVE";
  if (lender.status) return lender.status;
  if (typeof lender.active === "boolean") return lender.active ? "ACTIVE" : "INACTIVE";
  return "INACTIVE";
};

const isLenderActive = (lender?: Lender | null) => getLenderStatus(lender) === "ACTIVE";

const getSubmissionBadgeLabel = (method?: Lender["submissionConfig"]["method"] | null) =>
  method === "GOOGLE_SHEET" ? "Sheet-based submission" : getSubmissionMethodLabel(method);

const renderSubmissionMethodBadge = (method?: Lender["submissionConfig"]["method"] | null) => (
  <span className={`status-pill status-pill--submission-${getSubmissionMethodBadgeTone(method)}`}>
    {getSubmissionBadgeLabel(method)}
  </span>
);

const mapLenderToFormValues = (lender: Lender): LenderFormValues => {
  const primaryContact = lender.primaryContact ?? {
    name: "",
    email: "",
    phone: ""
  };
  const submissionConfig = lender.submissionConfig ?? {
    method: "EMAIL",
    submissionEmail: ""
  };
  const submissionMappings = parseMappingPreview(submissionConfig.mappingPreview);
  return {
    ...createEmptyLenderForm(),
    name: lender.name ?? "",
    active: isLenderActive(lender),
    country: normalizeLenderCountryValue(lender.address?.country ?? "") || COUNTRIES[0]?.value || "",
    primaryContactName: primaryContact.name ?? "",
    primaryContactEmail: primaryContact.email ?? "",
    primaryContactPhone: primaryContact.phone ?? "",
    website: lender.website ?? "",
    internalNotes: lender.internalNotes ?? "",
    submissionMethod: submissionConfig.method ?? "EMAIL",
    submissionEmail: submissionConfig.submissionEmail ?? "",
    submissionAttachmentFormat: submissionConfig.attachmentFormat ?? "PDF",
    submissionSheetId: submissionConfig.sheetId ?? "",
    submissionWorksheetName: submissionConfig.worksheetName ?? "",
    submissionMappingPreview: submissionConfig.mappingPreview ?? buildMappingPreview(submissionMappings),
    submissionMappings,
    submissionSheetStatus: submissionConfig.sheetStatus ?? "",
    submissionApiEndpoint: submissionConfig.apiBaseUrl ?? "",
    submissionApiAuthType: submissionConfig.apiAuthType ?? "token"
  };
};

const LendersContent = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const { lenderId } = useParams();
  const isNewRoute = location.pathname.endsWith("/new");

  const { data: lenders = [], isLoading, error, refetch: refetchLenders } = useQuery<Lender[], Error>({
    queryKey: ["lenders"],
    queryFn: async ({ signal }) => (await fetchLenders({ signal })) ?? []
  });
  const safeLenders = Array.isArray(lenders) ? lenders : [];

  const [selectedLenderId, setSelectedLenderId] = useState<string | null>(null);
  const [isLenderModalOpen, setIsLenderModalOpen] = useState(false);
  const [editingLenderId, setEditingLenderId] = useState<string | null>(null);
  const [editingLender, setEditingLender] = useState<Lender | null>(null);
  const [lenderFormValues, setLenderFormValues] = useState<LenderFormValues>(createEmptyLenderForm());
  const [lenderFormErrors, setLenderFormErrors] = useState<Record<string, string>>({});
  const [lenderSubmitError, setLenderSubmitError] = useState<string | null>(null);

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<LenderProduct | null>(null);
  const [productFormValues, setProductFormValues] = useState<ProductFormValues>(emptyProductForm(""));
  const [productFormErrors, setProductFormErrors] = useState<Record<string, string>>({});
  const [productSubmitError, setProductSubmitError] = useState<string | null>(null);
  const canManageLenders = useAuthorization({ roles: ["Admin", "Staff"] });

  const selectedLender = useMemo(
    () => safeLenders.find((lender) => lender.id === selectedLenderId) ?? null,
    [safeLenders, selectedLenderId]
  );

  const isSelectedLenderInactive = !isLenderActive(selectedLender);

  const {
    data: lenderDetail,
    isLoading: lenderDetailLoading,
    error: lenderDetailError
  } = useQuery<Lender | null, Error>({
    queryKey: ["lender-detail", editingLenderId ?? "none"],
    queryFn: async () => (await fetchLenderById(editingLenderId ?? "")) ?? null,
    enabled: Boolean(editingLenderId && isLenderModalOpen)
  });

  const {
    data: products = [],
    isLoading: productsLoading,
    error: productsError,
    refetch: refetchProducts
  } = useQuery<LenderProduct[], Error>({
    queryKey: ["lender-products", selectedLenderId ?? "none"],
    queryFn: async ({ signal }) => (await fetchLenderProducts(selectedLenderId ?? "", { signal })) ?? [],
    enabled: Boolean(selectedLenderId),
    placeholderData: (previousData) => previousData ?? []
  });
  const safeProducts = Array.isArray(products) ? products : [];
  const hasSelectedLender = Boolean(selectedLender);
  const productsToRender = hasSelectedLender && !isSelectedLenderInactive ? safeProducts : [];
  const hasStartupCategory =
    productsToRender.some((product) => product.category === "STARTUP_CAPITAL") ||
    editingProduct?.category === "STARTUP_CAPITAL";

  const groupedProducts = useMemo(() => {
    const categories: PortalProductCategory[] = hasStartupCategory
      ? [...PORTAL_PRODUCT_CATEGORIES, "STARTUP_CAPITAL"]
      : [...PORTAL_PRODUCT_CATEGORIES];
    const map = new Map<LenderProductCategory, LenderProduct[]>();
    productsToRender.forEach((product) => {
      const category = product.category ?? LENDER_PRODUCT_CATEGORIES[0];
      const list = map.get(category) ?? [];
      list.push(product);
      map.set(category, list);
    });
    const extraCategories = Array.from(map.keys()).filter((category) => !isPortalProductCategory(category));
    const allCategories: LenderProductCategory[] = [...categories, ...extraCategories];
    return allCategories
      .map((category) => ({
        category,
        label:
          (isPortalProductCategory(category) ? PORTAL_PRODUCT_CATEGORY_LABELS[category] : undefined) ??
          LENDER_PRODUCT_CATEGORY_LABELS[category],
        products: map.get(category) ?? []
      }))
      .filter((group) => group.products.length > 0);
  }, [hasStartupCategory, productsToRender]);

  useEffect(() => {
    if (isNewRoute) {
      setEditingLender(null);
      setEditingLenderId(null);
      setLenderFormValues(createEmptyLenderForm());
      setLenderFormErrors({});
      setIsLenderModalOpen(true);
      return;
    }
    if (!lenderId) return;
    setSelectedLenderId(lenderId);
    setEditingLenderId(lenderId);
    setIsLenderModalOpen(true);
  }, [isNewRoute, lenderId]);

  useEffect(() => {
    if (!safeLenders.length) return;
    if (!selectedLenderId || !safeLenders.some((lender) => lender.id === selectedLenderId)) {
      const firstLender = safeLenders[0];
      setSelectedLenderId(firstLender?.id ?? null);
    }
  }, [safeLenders, selectedLenderId]);

  useEffect(() => {
    if (lenderDetail && editingLenderId && lenderDetail.id === editingLenderId) {
      setEditingLender(lenderDetail);
      queryClient.setQueryData<Lender[]>(["lenders"], (current = []) =>
        current.map((lender) => (lender.id === lenderDetail.id ? lenderDetail : lender))
      );
    }
  }, [editingLenderId, lenderDetail, queryClient]);

  useEffect(() => {
    if (!isLenderModalOpen) return;
    if (editingLenderId) {
      if (!lenderDetail) return;
      setLenderFormValues(mapLenderToFormValues(lenderDetail));
      setLenderFormErrors({});
      setLenderSubmitError(null);
      return;
    }
    setLenderFormValues(createEmptyLenderForm());
    setLenderFormErrors({});
    setLenderSubmitError(null);
  }, [editingLenderId, isLenderModalOpen, lenderDetail]);

  const lenderFieldMap = useMemo(
    () => ({
      name: "name",
      country: "country",
      active: "active",
      submission_method: "submissionMethod",
      submission_email: "submissionEmail",
      submission_sheet_id: "submissionSheetId",
      submission_worksheet_name: "submissionWorksheetName",
      submission_mapping_preview: "submissionMappingPreview",
      contact_name: "primaryContactName",
      contact_email: "primaryContactEmail",
      contact_phone: "primaryContactPhone",
      website: "website"
    }),
    []
  );

  const productFieldMap = useMemo(
    () => ({
      lender_id: "lenderId",
      product_name: "productName",
      category: "category",
      country: "country",
      min_amount: "minAmount",
      max_amount: "maxAmount",
      min_term: "minTerm",
      max_term: "maxTerm",
      rate_type: "rateType",
      interest_min: "interestMin",
      interest_max: "interestMax",
      fees: "fees",
      required_documents: "requiredDocuments"
    }),
    []
  );

  const createLenderMutation = useMutation({
    mutationFn: (payload: LenderPayload) => createLender(payload),
    onMutate: () => {
      setLenderSubmitError(null);
      setLenderFormErrors({});
    },
    onSuccess: async (created) => {
      emitUiTelemetry("lender_create", {
        lenderId: created.id,
        requestId: getRequestId()
      });
      await queryClient.invalidateQueries({ queryKey: ["lenders"] });
      setEditingLender(created);
      setEditingLenderId(created.id);
      setSelectedLenderId(created.id);
      setIsLenderModalOpen(false);
      navigate(`/lenders/${created.id}`);
    },
    onError: (error) => {
      const validationErrors = extractValidationErrors(error, lenderFieldMap);
      if (validationErrors && Object.keys(validationErrors).length) {
        setLenderFormErrors(validationErrors);
        return;
      }
      setLenderSubmitError(getErrorMessage(error, "Unable to save lender. Please retry."));
    }
  });

  const updateLenderMutation = useMutation({
    mutationFn: ({ lenderId, payload }: { lenderId: string; payload: Partial<LenderPayload> }) =>
      updateLender(lenderId, payload),
    onMutate: () => {
      setLenderSubmitError(null);
      setLenderFormErrors({});
    },
    onSuccess: async (updated) => {
      emitUiTelemetry("lender_update", {
        lenderId: updated.id,
        requestId: getRequestId()
      });
      await queryClient.invalidateQueries({ queryKey: ["lenders"] });
      setEditingLender(updated);
      setEditingLenderId(updated.id);
      setSelectedLenderId(updated.id);
      setIsLenderModalOpen(false);
    },
    onError: (error) => {
      const validationErrors = extractValidationErrors(error, lenderFieldMap);
      if (validationErrors && Object.keys(validationErrors).length) {
        setLenderFormErrors(validationErrors);
        return;
      }
      setLenderSubmitError(getErrorMessage(error, "Unable to save lender. Please retry."));
    }
  });

  const createProductMutation = useMutation({
    mutationFn: (payload: LenderProductPayload) => createLenderProduct(payload),
    onMutate: () => {
      setProductSubmitError(null);
      setProductFormErrors({});
    },
    onError: (error) => {
      const validationErrors = extractValidationErrors(error, productFieldMap);
      if (validationErrors && Object.keys(validationErrors).length) {
        setProductFormErrors(validationErrors);
        return;
      }
      setProductSubmitError(getErrorMessage(error, "Unable to save product. Please retry."));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["lender-products"] });
      await refetchProducts();
      setIsProductModalOpen(false);
      setEditingProduct(null);
      setProductSubmitError(null);
    }
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ productId, payload }: { productId: string; payload: Partial<LenderProductPayload> }) =>
      updateLenderProduct(productId, payload),
    onMutate: () => {
      setProductSubmitError(null);
      setProductFormErrors({});
    },
    onError: (error, _payload, context) => {
      const validationErrors = extractValidationErrors(error, productFieldMap);
      if (validationErrors && Object.keys(validationErrors).length) {
        setProductFormErrors(validationErrors);
        return;
      }
      setProductSubmitError(getErrorMessage(error, "Unable to save product. Please retry."));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["lender-products"] });
      await refetchProducts();
      setIsProductModalOpen(false);
      setEditingProduct(null);
      setProductSubmitError(null);
    }
  });

  const mutationLoading = createLenderMutation.isPending || updateLenderMutation.isPending;
  const productMutationLoading = createProductMutation.isPending || updateProductMutation.isPending;
  const rateTypeOptions: RateType[] = ["fixed", "variable"];
  const activeLenderOptions = safeLenders
    .filter((lender) => isLenderActive(lender))
    .map((lender) => ({
      value: lender.id,
      label: lender.name || "Unnamed lender"
    }));
  const selectedLenderOption =
    selectedLender && !isLenderActive(selectedLender)
      ? {
          value: selectedLender.id,
          label: `${selectedLender.name || "Unnamed lender"} (Inactive)`,
          disabled: true
        }
      : null;
  const lenderOptions = selectedLenderOption ? [selectedLenderOption, ...activeLenderOptions] : activeLenderOptions;

  const validateLenderForm = (values: LenderFormValues) => {
    const nextErrors: Record<string, string> = {};
    if (!values.name.trim()) nextErrors.name = "Name is required.";
    if (!values.country.trim()) nextErrors.country = "Country is required.";
    if (!values.primaryContactName.trim()) nextErrors.primaryContactName = "Primary contact name is required.";
    if (!values.primaryContactEmail.trim()) {
      nextErrors.primaryContactEmail = "Primary contact email is required.";
    } else if (!isValidEmail(values.primaryContactEmail)) {
      nextErrors.primaryContactEmail = "Enter a valid email.";
    }
    if (!values.submissionMethod) nextErrors.submissionMethod = "Submission method is required.";
    if (values.submissionMethod === "EMAIL" && !values.submissionEmail.trim()) {
      nextErrors.submissionEmail = "Target email address is required.";
    } else if (values.submissionMethod === "EMAIL" && !isValidEmail(values.submissionEmail)) {
      nextErrors.submissionEmail = "Enter a valid email address.";
    }
    if (values.submissionMethod === "GOOGLE_SHEET") {
      if (!values.submissionSheetId.trim()) {
        nextErrors.submissionSheetId = "Google Sheet ID is required.";
      }
      if (!values.submissionWorksheetName.trim()) {
        nextErrors.submissionWorksheetName = "Sheet tab name is required.";
      }
      const mappingError = validateSheetMappings(values.submissionMappings);
      if (mappingError) {
        nextErrors.submissionMappingPreview = mappingError;
      }
    }
    return nextErrors;
  };

  const buildLenderPayload = (values: LenderFormValues): LenderPayload => ({
    name: values.name.trim(),
    status: values.active ? "ACTIVE" : "INACTIVE",
    phone: values.primaryContactPhone.trim(),
    website: values.website.trim() ? values.website.trim() : null,
    description: null,
    internal_notes: values.internalNotes.trim() ? values.internalNotes.trim() : null,
    street: "",
    city: "",
    region: "",
    country: values.country.trim(),
    postal_code: "",
    contact_name: values.primaryContactName.trim(),
    contact_email: values.primaryContactEmail.trim(),
    contact_phone: values.primaryContactPhone.trim(),
    submission_method: values.submissionMethod,
    submission_email: values.submissionMethod === "EMAIL" ? values.submissionEmail.trim() : null,
    submission_attachment_format:
      values.submissionMethod === "EMAIL" ? values.submissionAttachmentFormat : null,
    submission_sheet_id: values.submissionMethod === "GOOGLE_SHEET" ? toOptionalTrim(values.submissionSheetId) : null,
    submission_worksheet_name:
      values.submissionMethod === "GOOGLE_SHEET" ? toOptionalTrim(values.submissionWorksheetName) : null,
    submission_mapping_preview:
      values.submissionMethod === "GOOGLE_SHEET" ? toOptionalTrim(values.submissionMappingPreview) : null,
    submission_sheet_status:
      values.submissionMethod === "GOOGLE_SHEET" ? toOptionalTrim(values.submissionSheetStatus) : null,
    submission_api_endpoint: values.submissionMethod === "API" ? toOptionalTrim(values.submissionApiEndpoint) : null,
    submission_api_auth_type: values.submissionMethod === "API" ? values.submissionApiAuthType : null
  });

  const validateProductForm = (values: ProductFormValues) => {
    const errors: Record<string, string> = {};
    if (!values.lenderId) errors.lenderId = "Lender is required.";
    const isActiveLender = safeLenders.some((lender) => lender.id === values.lenderId && isLenderActive(lender));
    if (values.lenderId && !isActiveLender) {
      errors.lenderId = "Lender must be active.";
    }
    if (!values.productName.trim()) errors.productName = "Product name is required.";
    if (!values.category) errors.category = "Product category is required.";
    if (!values.country.length) errors.country = "Country is required.";
    if (!values.minAmount) errors.minAmount = "Minimum amount is required.";
    if (!values.maxAmount) errors.maxAmount = "Maximum amount is required.";
    const minAmount = Number(values.minAmount);
    const maxAmount = Number(values.maxAmount);
    if (Number.isNaN(minAmount)) errors.minAmount = "Minimum amount must be a number.";
    if (Number.isNaN(maxAmount)) errors.maxAmount = "Maximum amount must be a number.";
    if (!Number.isNaN(minAmount) && !Number.isNaN(maxAmount) && minAmount > maxAmount) {
      errors.maxAmount = "Maximum amount must be greater than minimum.";
    }
    if (!values.minTerm) errors.minTerm = "Minimum term is required.";
    if (!values.maxTerm) errors.maxTerm = "Maximum term is required.";
    const minTerm = Number(values.minTerm);
    const maxTerm = Number(values.maxTerm);
    if (Number.isNaN(minTerm)) errors.minTerm = "Minimum term must be a number.";
    if (Number.isNaN(maxTerm)) errors.maxTerm = "Maximum term must be a number.";
    if (!Number.isNaN(minTerm) && !Number.isNaN(maxTerm) && minTerm > maxTerm) {
      errors.maxTerm = "Maximum term must be greater than minimum.";
    }
    if (!values.rateType) errors.rateType = "Rate type is required.";
    if (!values.interestMin) errors.interestMin = "Interest minimum is required.";
    if (!values.interestMax) errors.interestMax = "Interest maximum is required.";
    if (values.rateType === "variable") {
      if (values.interestMin && !isValidVariableRate(values.interestMin)) {
        errors.interestMin = "Use format Prime + X%.";
      }
      if (values.interestMax && !isValidVariableRate(values.interestMax)) {
        errors.interestMax = "Use format Prime + Y%.";
      }
    } else {
      const interestMin = Number(values.interestMin);
      const interestMax = Number(values.interestMax);
      if (Number.isNaN(interestMin)) errors.interestMin = "Interest minimum must be a number.";
      if (Number.isNaN(interestMax)) errors.interestMax = "Interest maximum must be a number.";
      if (!Number.isNaN(interestMin) && interestMin < 0) {
        errors.interestMin = "Interest minimum must be positive.";
      }
      if (!Number.isNaN(interestMax) && interestMax < 0) {
        errors.interestMax = "Interest maximum must be positive.";
      }
      if (!Number.isNaN(interestMin) && !Number.isNaN(interestMax) && interestMin > interestMax) {
        errors.interestMax = "Interest maximum must be greater than minimum.";
      }
    }
    return errors;
  };

  const buildProductPayload = (values: ProductFormValues, existing?: LenderProduct | null): LenderProductPayload => {
    const normalizedCountry = normalizeCountrySelection(values.country);
    const resolvedCountry = normalizedCountry || "CA";
    const resolvedRateType = resolveRateType(values.rateType);
    const interestRateMin = formatInterestPayload(resolvedRateType, values.interestMin);
    const interestRateMax = formatInterestPayload(resolvedRateType, values.interestMax);
    const minTerm = Number(values.minTerm);
    const maxTerm = Number(values.maxTerm);
    const resolvedCurrency = deriveCurrency(resolvedCountry, existing?.currency ?? null);
    return {
      lenderId: values.lenderId,
      productName: values.productName.trim() || existing?.productName || deriveProductName(values.category),
      active: values.active,
      category: values.category,
      country: resolvedCountry,
      currency: resolvedCurrency,
      minAmount: Number(values.minAmount),
      maxAmount: Number(values.maxAmount),
      interestRateMin,
      interestRateMax,
      rateType: resolvedRateType,
      termLength: {
        min: Number.isNaN(minTerm) ? 0 : minTerm,
        max: Number.isNaN(maxTerm) ? 0 : maxTerm,
        unit: "months"
      },
      fees: values.fees.trim() ? values.fees.trim() : null,
      minimumCreditScore: existing?.minimumCreditScore ?? null,
      ltv: existing?.ltv ?? null,
      eligibilityRules: existing?.eligibilityRules ?? null,
      eligibilityFlags: existing?.eligibilityFlags ?? {
        minimumRevenue: null,
        timeInBusinessMonths: null,
        industryRestrictions: null
      },
      required_documents: buildRequiredDocumentsPayload(values.requiredDocuments)
    };
  };

  const updateProductForm = (updates: Partial<ProductFormValues>) => {
    setProductFormValues((prev) => {
      const next = { ...prev, ...updates };
      const resolvedRateType = next.rateType ?? prev.rateType;
      if (updates.interestMin !== undefined) {
        next.interestMin = normalizeInterestInput(resolvedRateType, updates.interestMin);
      }
      if (updates.interestMax !== undefined) {
        next.interestMax = normalizeInterestInput(resolvedRateType, updates.interestMax);
      }
      if (updates.rateType && updates.rateType === "variable") {
        next.interestMin = normalizeInterestInput("variable", next.interestMin);
        next.interestMax = normalizeInterestInput("variable", next.interestMax);
      }
      return next;
    });
  };

  const handleProductSubmit = () => {
    if (!canManageLenders) return;
    const errors = validateProductForm(productFormValues);
    setProductFormErrors(errors);
    if (Object.keys(errors).length) return;
    const payload = buildProductPayload(productFormValues, editingProduct);
    if (editingProduct?.id) {
      updateProductMutation.mutate({ productId: editingProduct.id, payload });
      return;
    }
    createProductMutation.mutate(payload);
  };

  const handleLenderSubmit = () => {
    if (!canManageLenders) return;
    const errors = validateLenderForm(lenderFormValues);
    setLenderFormErrors(errors);
    if (Object.keys(errors).length) return;
    const payload = buildLenderPayload(lenderFormValues);
    if (editingLender?.id) {
      updateLenderMutation.mutate({ lenderId: editingLender.id, payload });
      return;
    }
    createLenderMutation.mutate(payload);
  };

  const closeLenderModal = () => {
    setIsLenderModalOpen(false);
    setEditingLender(null);
    setEditingLenderId(null);
    setLenderSubmitError(null);
    setLenderFormErrors({});
    navigate("/lenders");
  };

  const openEditModal = (lenderIdValue: string) => {
    setEditingLenderId(lenderIdValue);
    setIsLenderModalOpen(true);
  };

  const closeProductModal = () => {
    setIsProductModalOpen(false);
    setEditingProduct(null);
    setProductSubmitError(null);
    setProductFormErrors({});
  };

  const handleLenderSelection = (lenderIdValue: string) => {
    if (lenderIdValue === selectedLenderId) return;
    setSelectedLenderId(lenderIdValue);
    setEditingLender(null);
  };

  const handleAddProduct = () => {
    if (!selectedLender?.id) return;
    setEditingProduct(null);
    setIsProductModalOpen(true);
    setProductFormValues(emptyProductForm(selectedLender.id));
    setProductFormErrors({});
  };

  const handleEditProduct = (product: LenderProduct) => {
    setEditingProduct(product);
    setIsProductModalOpen(true);
    setProductFormErrors({});
  };

  if (isLoading || productsLoading) return <AppLoading />;
  if (error || productsError) {
    return (
      <ErrorBanner
        message={getErrorMessage(error ?? productsError, "Unable to load lender data.")}
        onRetry={() => {
          refetchLenders();
          refetchProducts();
        }}
      />
    );
  }

  const handleMappingChange = (rows: SheetMappingRow[]) => {
    setLenderFormValues((prev) => ({
      ...prev,
      submissionMappings: rows,
      submissionMappingPreview: buildMappingPreview(rows)
    }));
  };

  return (
    <div className="page page--lenders">
      <div className="page-header">
        <div>
          <h1>Lenders</h1>
          <p className="page-header__subtitle">Manage lender details and submission settings.</p>
        </div>
        <ActionGate actions={["create_lender"]}>
          <Button
            variant="primary"
            onClick={() => {
              setEditingLender(null);
              setEditingLenderId(null);
              setIsLenderModalOpen(true);
              setLenderFormValues(createEmptyLenderForm());
              setLenderFormErrors({});
            }}
          >
            Create lender
          </Button>
        </ActionGate>
      </div>

      <div className="page-grid">
        <Card>
          <div className="card__body">
            {!safeLenders.length ? (
              <div className="text-sm text-slate-500">No lenders added yet.</div>
            ) : (
              <div className="management-grid">
                <Select
                  label="Lender"
                  value={selectedLenderId ?? ""}
                  onChange={(event) => handleLenderSelection(event.target.value)}
                >
                  {safeLenders.map((lender) => (
                    <option key={lender.id} value={lender.id}>
                      {lender.name || "Unnamed lender"}
                    </option>
                  ))}
                </Select>
                {selectedLender && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`status-pill status-pill--${isLenderActive(selectedLender) ? "active" : "paused"}`}>
                      {isLenderActive(selectedLender) ? "Lender active" : "Lender inactive"}
                    </span>
                    <span>{formatLenderCountryLabel(selectedLender.address?.country) || "—"}</span>
                    {!isLenderActive(selectedLender) && (
                      <span className="text-xs text-amber-600">Inactive lenders hide products.</span>
                    )}
                  </div>
                )}
                {selectedLender ? (
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => openEditModal(selectedLender.id)}>
                      Edit lender
                    </Button>
                    <Button variant="secondary" onClick={handleAddProduct} disabled={isSelectedLenderInactive}>
                      Add product
                    </Button>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div className="card__body">
            {hasSelectedLender && !isSelectedLenderInactive ? (
              <div className="space-y-4">
                {groupedProducts.map((group) => (
                  <div key={group.category}>
                    <h3 className="text-lg font-semibold">{group.label}</h3>
                    <div className="mt-2">
                      <Table headers={["Product", "Country", "Submission", "Status", "Min/Max"]}>
                        {group.products.map((product) => {
                          const productActive = Boolean(product.active);
                          const minAmount = product.minAmount || 0;
                          const maxAmount = product.maxAmount || 0;
                          return (
                            <tr key={product.id}>
                              <td>
                                <button
                                  type="button"
                                  className="text-left text-sm font-medium text-slate-900 hover:underline"
                                  onClick={() => handleEditProduct(product)}
                                >
                                  {product.productName}
                                </button>
                              </td>
                              <td>{formatLenderCountryLabel(product.country) || "—"}</td>
                              <td>{renderSubmissionMethodBadge(selectedLender?.submissionConfig?.method ?? "MANUAL")}</td>
                              <td>
                                <span className={`status-pill status-pill--${productActive ? "active" : "paused"}`}>
                                  {productActive ? "Active" : "Inactive"}
                                </span>
                              </td>
                              <td>
                                ${minAmount.toLocaleString()} - ${maxAmount.toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                      </Table>
                    </div>
                  </div>
                ))}
                {!productsToRender.length && (
                  <div className="text-sm text-slate-500">No products for this lender.</div>
                )}
              </div>
            ) : (
              <div className="text-sm text-slate-500">
                {hasSelectedLender
                  ? "This lender is inactive, so products are hidden."
                  : "Select a lender to view products."}
              </div>
            )}
          </div>
        </Card>
      </div>

      {isLenderModalOpen && (
        <Modal
          title={editingLender ? "Edit lender" : "Create lender"}
          onClose={closeLenderModal}
        >
          {lenderDetailLoading && editingLenderId && <AppLoading />}
          {lenderDetailError && (
            <ErrorBanner message={getErrorMessage(lenderDetailError, "Unable to load lender details.")} />
          )}
          {lenderSubmitError && (
            <div className="space-y-2">
              <ErrorBanner message={lenderSubmitError} />
              <Button type="button" variant="secondary" onClick={handleLenderSubmit} disabled={mutationLoading}>
                Retry save
              </Button>
            </div>
          )}
          <form
            className="management-form"
            onSubmit={(event) => {
              event.preventDefault();
              handleLenderSubmit();
            }}
          >
            <div className="management-field">
              <span className="management-field__label">Lender details</span>
              <Input
                label="Lender name"
                value={lenderFormValues.name}
                onChange={(event) => setLenderFormValues((prev) => ({ ...prev, name: event.target.value }))}
                error={lenderFormErrors.name}
              />
              <Select
                label="Country"
                value={lenderFormValues.country}
                onChange={(event) =>
                  setLenderFormValues((prev) => ({
                    ...prev,
                    country: event.target.value
                  }))
                }
              >
                {COUNTRIES.map((country) => (
                  <option key={country.value} value={country.value}>
                    {country.label}
                  </option>
                ))}
              </Select>
              {lenderFormErrors.country && <span className="ui-field__error">{lenderFormErrors.country}</span>}
              <label className="management-toggle">
                <input
                  type="checkbox"
                  checked={lenderFormValues.active}
                  onChange={(event) =>
                    setLenderFormValues((prev) => ({ ...prev, active: event.target.checked }))
                  }
                />
                <span>Active lender</span>
              </label>
            </div>

            <div className="management-field">
              <span className="management-field__label">Primary contact</span>
              <Input
                label="Contact name"
                value={lenderFormValues.primaryContactName}
                onChange={(event) =>
                  setLenderFormValues((prev) => ({ ...prev, primaryContactName: event.target.value }))
                }
                error={lenderFormErrors.primaryContactName}
              />
              <Input
                label="Contact email"
                value={lenderFormValues.primaryContactEmail}
                onChange={(event) =>
                  setLenderFormValues((prev) => ({ ...prev, primaryContactEmail: event.target.value }))
                }
                error={lenderFormErrors.primaryContactEmail}
              />
              <div className="management-grid__row">
                <Input
                  label="Contact phone"
                  value={lenderFormValues.primaryContactPhone}
                  onChange={(event) =>
                    setLenderFormValues((prev) => ({ ...prev, primaryContactPhone: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="management-field">
              <span className="management-field__label">Additional details</span>
              <Input
                label="Website"
                value={lenderFormValues.website}
                onChange={(event) => setLenderFormValues((prev) => ({ ...prev, website: event.target.value }))}
              />
              <label className="ui-field">
                <span className="ui-field__label">Notes (internal only)</span>
                <textarea
                  className="ui-input ui-textarea"
                  value={lenderFormValues.internalNotes}
                  onChange={(event) =>
                    setLenderFormValues((prev) => ({ ...prev, internalNotes: event.target.value }))
                  }
                />
              </label>
            </div>

            <div className="management-field">
              <span className="management-field__label">Submission method</span>
              <Select
                label="Submission method"
                value={lenderFormValues.submissionMethod}
                onChange={(event) =>
                  setLenderFormValues((prev) => ({
                    ...prev,
                    submissionMethod: event.target.value as SubmissionMethod
                  }))
                }
              >
                {SUBMISSION_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {SUBMISSION_METHOD_LABELS[method]}
                  </option>
                ))}
              </Select>
              {lenderFormErrors.submissionMethod && (
                <span className="ui-field__error">{lenderFormErrors.submissionMethod}</span>
              )}
              {lenderFormValues.submissionMethod === "GOOGLE_SHEET" && (
                <div className="space-y-3">
                  <Input
                    label="Google Sheet ID"
                    value={lenderFormValues.submissionSheetId}
                    onChange={(event) =>
                      setLenderFormValues((prev) => ({ ...prev, submissionSheetId: event.target.value }))
                    }
                    error={lenderFormErrors.submissionSheetId}
                  />
                  <Input
                    label="Sheet tab name"
                    value={lenderFormValues.submissionWorksheetName}
                    onChange={(event) =>
                      setLenderFormValues((prev) => ({ ...prev, submissionWorksheetName: event.target.value }))
                    }
                    error={lenderFormErrors.submissionWorksheetName}
                  />
                  <div className="ui-field">
                    <span className="ui-field__label">Column mapping editor</span>
                    <GoogleSheetMappingEditor
                      rows={lenderFormValues.submissionMappings}
                      onChange={handleMappingChange}
                      error={lenderFormErrors.submissionMappingPreview}
                    />
                  </div>
                  <div className="ui-field">
                    <span className="ui-field__label">Status</span>
                    {(() => {
                      const status = getSheetStatusBadge(lenderFormValues.submissionSheetStatus);
                      return <span className={`status-pill status-pill--${status.tone}`}>{status.label}</span>;
                    })()}
                  </div>
                </div>
              )}
              {lenderFormValues.submissionMethod === "EMAIL" && (
                <div className="space-y-3">
                  <Input
                    label="Target email address"
                    value={lenderFormValues.submissionEmail}
                    onChange={(event) =>
                      setLenderFormValues((prev) => ({ ...prev, submissionEmail: event.target.value }))
                    }
                    error={lenderFormErrors.submissionEmail}
                  />
                  <Select
                    label="Attachment format"
                    value={lenderFormValues.submissionAttachmentFormat}
                    onChange={(event) =>
                      setLenderFormValues((prev) => ({
                        ...prev,
                        submissionAttachmentFormat: event.target.value as "PDF" | "CSV"
                      }))
                    }
                  >
                    <option value="PDF">PDF</option>
                    <option value="CSV">CSV</option>
                  </Select>
                </div>
              )}
              {lenderFormValues.submissionMethod === "API" && (
                <div className="space-y-3">
                  <Input
                    label="Endpoint"
                    type="password"
                    value={lenderFormValues.submissionApiEndpoint}
                    placeholder="https://api.example.com"
                    onChange={(event) =>
                      setLenderFormValues((prev) => ({ ...prev, submissionApiEndpoint: event.target.value }))
                    }
                  />
                  <Select
                    label="Auth type"
                    value={lenderFormValues.submissionApiAuthType}
                    onChange={(event) =>
                      setLenderFormValues((prev) => ({
                        ...prev,
                        submissionApiAuthType: event.target.value as "token" | "key"
                      }))
                    }
                  >
                    <option value="token">Token</option>
                    <option value="key">Key</option>
                  </Select>
                </div>
              )}
              {lenderFormValues.submissionMethod === "MANUAL" && (
                <p className="text-xs text-slate-500">Manual submissions are tracked internally only.</p>
              )}
            </div>

            <div className="management-actions">
              <Button type="submit" disabled={mutationLoading}>
                {editingLender ? "Save changes" : "Create lender"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {isProductModalOpen && selectedLender && (
        <LenderProductModal
          isOpen={isProductModalOpen}
          title={editingProduct ? "Edit product" : "Add product"}
          isSaving={productMutationLoading}
          isSubmitDisabled={isSelectedLenderInactive}
          errorMessage={productSubmitError}
          lenderOptions={lenderOptions}
          formValues={productFormValues}
          formErrors={productFormErrors}
          categoryOptions={buildCategoryOptions(hasStartupCategory)}
          rateTypes={rateTypeOptions}
          documentOptions={PRODUCT_DOCUMENT_OPTIONS}
          formatRateType={formatRateType}
          onChange={updateProductForm}
          onSubmit={handleProductSubmit}
          onClose={closeProductModal}
          onCancel={closeProductModal}
          statusNote={
            <div className="space-y-2">
              {isSelectedLenderInactive && (
                <p className="text-xs text-amber-600">
                  This lender is inactive. Products will remain inactive until the lender is active again.
                </p>
              )}
              {productSubmitError && (
                <Button type="button" variant="secondary" onClick={handleProductSubmit} disabled={productMutationLoading}>
                  Retry save
                </Button>
              )}
            </div>
          }
        />
      )}
    </div>
  );
};

const buildCategoryOptions = (hasStartupCategory: boolean) => {
  const categories: PortalProductCategory[] = hasStartupCategory
    ? [...PORTAL_PRODUCT_CATEGORIES, "STARTUP_CAPITAL"]
    : [...PORTAL_PRODUCT_CATEGORIES];
  return categories.map((category) => ({
    value: category,
    label: PORTAL_PRODUCT_CATEGORY_LABELS[category] ?? LENDER_PRODUCT_CATEGORY_LABELS[category]
  }));
};

const LendersPage = () => (
  <RequireRole roles={["Admin", "Staff"]}>
    <ErrorBoundary>
      <LendersContent />
    </ErrorBoundary>
  </RequireRole>
);

export default LendersPage;
