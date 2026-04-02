import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ErrorBanner from "@/components/ui/ErrorBanner";
import ActionGate from "@/components/auth/ActionGate";
import RequireRole from "@/components/auth/RequireRole";
import AppLoading from "@/components/layout/AppLoading";
import LenderProductModal, { type ProductFormValues } from "@/components/LenderProductModal";
import Select from "@/components/ui/Select";
import { getErrorMessage } from "@/utils/errors";
import { getSubmissionMethodBadgeTone, getSubmissionMethodLabel } from "@/utils/submissionMethods";
import { ApiError } from "@/lib/api";
import { useAuthorization } from "@/hooks/useAuthorization";
import {
  createLenderProduct,
  fetchLenderProducts,
  fetchLenders,
  updateLenderProduct,
  type Lender,
  type LenderProduct,
  type LenderProductPayload
} from "@/api/lenders";
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
import Table from "@/components/ui/Table";

const CATEGORY_DISPLAY_ORDER = [
  "LINE_OF_CREDIT",
  "TERM_LOAN",
  "EQUIPMENT_FINANCE",
  "FACTORING",
  "PURCHASE_ORDER_FINANCE"
 ] as const satisfies LenderProductCategory[];

type PortalProductCategory = (typeof CATEGORY_DISPLAY_ORDER)[number] | "STARTUP_CAPITAL";

const PORTAL_PRODUCT_CATEGORY_LABELS: Record<PortalProductCategory, string> = {
  LINE_OF_CREDIT: "Line of Credit",
  TERM_LOAN: "Term Loan",
  EQUIPMENT_FINANCE: "Equipment Financing",
  FACTORING: "Factoring",
  PURCHASE_ORDER_FINANCE: "Purchase Order Financing",
  STARTUP_CAPITAL: "Startup Financing"
};

const RATE_TYPE_OPTIONS: RateType[] = ["fixed", "variable"];

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

const toFormString = (value?: number | string | null) => {
  if (value === null || value === undefined) return "";
  return String(value);
};

const formatRateType = (value: RateType) => value.charAt(0).toUpperCase() + value.slice(1);

const formatLenderCountryLabel = (value?: string | null) => {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) return "";
  const normalized = trimmed.toUpperCase();
  if (normalized === "CA" || normalized === "CANADA") return "Canada";
  if (normalized === "US" || normalized === "USA" || normalized === "UNITED STATES") return "United States";
  if (normalized === "BOTH") return "Both";
  return trimmed;
};

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

const LenderProductsContent = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const { productId } = useParams();
  const [searchParams] = useSearchParams();
  const [activeLenderId, setActiveLenderId] = useState<string>("");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<LenderProduct | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formValues, setFormValues] = useState<ProductFormValues>(emptyProductForm(""));
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const canManageProducts = useAuthorization({ roles: ["Admin", "Staff"] });
  const isNewRoute = location.pathname.endsWith("/new");

  const { data: lenders = [], isLoading: lendersLoading, error: lendersError, refetch: refetchLenders } = useQuery<
    Lender[],
    Error
  >({
    queryKey: ["lenders"],
    queryFn: ({ signal }) => fetchLenders({ signal }),
    staleTime: 30_000,
    refetchOnWindowFocus: false
  });
  const safeLenders = Array.isArray(lenders) ? lenders : [];
  const activeLenders = safeLenders.filter((lender) => isLenderActive(lender));

  useEffect(() => {
    if (activeLenderId) return;
    const requestedLenderId = searchParams.get("lenderId");
    if (requestedLenderId && activeLenders.some((lender) => lender.id === requestedLenderId)) {
      setActiveLenderId(requestedLenderId);
      return;
    }
    const firstActive = activeLenders.find((lender) => Boolean(lender?.id));
    if (firstActive?.id) {
      setActiveLenderId(firstActive.id);
    }
  }, [activeLenderId, activeLenders, searchParams]);

  useEffect(() => {
    if (!activeLenderId) return;
    if (activeLenders.some((lender) => lender.id === activeLenderId)) return;
    setActiveLenderId(activeLenders[0]?.id ?? "");
  }, [activeLenderId, activeLenders]);

  const activeLender = useMemo(
    () => activeLenders.find((lender) => lender.id === activeLenderId) ?? null,
    [activeLenderId, activeLenders]
  );
  const lenderSubmissionMethods = useMemo(() => {
    const map = new Map<string, Lender["submissionConfig"]["method"]>();
    safeLenders.forEach((lender) => {
      if (lender.id) {
        map.set(lender.id, lender.submissionConfig?.method ?? "MANUAL");
      }
    });
    return map;
  }, [safeLenders]);

  const {
    data: products = [],
    isLoading: productsLoading,
    error: productsError,
    refetch: refetchProducts
  } = useQuery<LenderProduct[], Error>({
    queryKey: ["lender-products", activeLenderId || "all"],
    queryFn: ({ signal }) => fetchLenderProducts(activeLenderId || undefined, { signal }),
    placeholderData: (previousData) => previousData ?? [],
    staleTime: 30_000,
    refetchOnWindowFocus: false
  });
  const safeProducts = Array.isArray(products) ? products : [];

  const visibleProducts = useMemo(() => {
    const activeIds = new Set(activeLenders.map((lender) => lender.id));
    return safeProducts.filter(
      (product) => activeIds.has(product.lenderId) && (!activeLenderId || product.lenderId === activeLenderId)
    );
  }, [activeLenderId, activeLenders, safeProducts]);

  const hasStartupCategory = useMemo(
    () => visibleProducts.some((product) => product.category === "STARTUP_CAPITAL") || editingProduct?.category === "STARTUP_CAPITAL",
    [visibleProducts, editingProduct]
  );

  const selectedProduct = useMemo(
    () => visibleProducts.find((product) => product.id === selectedProductId) ?? null,
    [visibleProducts, selectedProductId]
  );

  useEffect(() => {
    if (isNewRoute) {
      setSelectedProductId(null);
      setEditingProduct(null);
      setFormValues(emptyProductForm(activeLenderId));
      setFormErrors({});
      setIsModalOpen(activeLenders.length > 0);
      return;
    }
    if (!productId) return;
    setSelectedProductId(productId);
    setIsModalOpen(true);
  }, [activeLenderId, activeLenders.length, isNewRoute, productId]);

  useEffect(() => {
    if (!selectedProductId) return;
    if (selectedProduct && selectedProduct.id === selectedProductId) return;
    setEditingProduct(selectedProduct ?? null);
  }, [selectedProduct, selectedProductId]);

  useEffect(() => {
    if (!editingProduct) return;
    setFormValues({
      lenderId: editingProduct.lenderId,
      active: editingProduct.active,
      productName: editingProduct.productName,
      category: editingProduct.category,
      country: splitCountrySelection(editingProduct.country),
      minAmount: toFormString(editingProduct.minAmount),
      maxAmount: toFormString(editingProduct.maxAmount),
      minTerm: toFormString(editingProduct.termLength.min),
      maxTerm: toFormString(editingProduct.termLength.max),
      rateType: editingProduct.rateType,
      interestMin: toFormString(editingProduct.interestRateMin),
      interestMax: toFormString(editingProduct.interestRateMax),
      fees: editingProduct.fees ?? "",
      requiredDocuments: mapRequiredDocumentsToValues(editingProduct.requiredDocuments ?? [])
    });
  }, [editingProduct]);

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setSelectedProductId(null);
    setFormErrors({});
    setSubmitError(null);
  };

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

  const createMutation = useMutation({
    mutationFn: (payload: LenderProductPayload) => createLenderProduct(payload),
    onMutate: () => {
      setSubmitError(null);
      setFormErrors({});
    },
    onError: (error) => {
      const validationErrors = extractValidationErrors(error, productFieldMap);
      if (validationErrors && Object.keys(validationErrors).length) {
        setFormErrors(validationErrors);
        return;
      }
      setSubmitError(getErrorMessage(error, "Unable to save product. Please retry."));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["lender-products"] });
      await refetchProducts();
      setIsModalOpen(false);
      setEditingProduct(null);
      setSubmitError(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ productId, payload }: { productId: string; payload: Partial<LenderProductPayload> }) =>
      updateLenderProduct(productId, payload),
    onMutate: () => {
      setSubmitError(null);
      setFormErrors({});
    },
    onError: (error) => {
      const validationErrors = extractValidationErrors(error, productFieldMap);
      if (validationErrors && Object.keys(validationErrors).length) {
        setFormErrors(validationErrors);
        return;
      }
      setSubmitError(getErrorMessage(error, "Unable to save product. Please retry."));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["lender-products"] });
      await refetchProducts();
      setIsModalOpen(false);
      setEditingProduct(null);
      setSubmitError(null);
    }
  });

  const mutationLoading = createMutation.isPending || updateMutation.isPending;

  const validateForm = (values: ProductFormValues) => {
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

  const buildPayload = (values: ProductFormValues, existing?: LenderProduct | null): LenderProductPayload => {
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

  const updateForm = (updates: Partial<ProductFormValues>) => {
    setFormValues((prev) => {
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

  const handleSubmit = () => {
    if (!canManageProducts) return;
    const errors = validateForm(formValues);
    setFormErrors(errors);
    if (Object.keys(errors).length) return;
    const payload = buildPayload(formValues, editingProduct);
    if (editingProduct?.id) {
      updateMutation.mutate({ productId: editingProduct.id, payload });
      return;
    }
    createMutation.mutate(payload);
  };

  if (lendersLoading || productsLoading) return <AppLoading />;
  if (lendersError || productsError) {
    return (
      <ErrorBanner
        message={getErrorMessage(lendersError ?? productsError, "Unable to load lender products.")}
        onRetry={() => {
          refetchLenders();
          refetchProducts();
        }}
      />
    );
  }

  return (
    <div className="page page--lender-products">
      <div className="page-header">
        <div>
          <h1>Lender products</h1>
          <p className="page-header__subtitle">Manage lender products and submission requirements.</p>
        </div>
        <ActionGate actions={["create_lender_product"]}>
          <Button
            variant="primary"
            onClick={() => {
              setEditingProduct(null);
              setSelectedProductId(null);
              setFormValues(emptyProductForm(activeLenderId));
              setFormErrors({});
              setSubmitError(null);
              setIsModalOpen(true);
            }}
            disabled={!activeLenderId}
          >
            Add product
          </Button>
        </ActionGate>
      </div>

      <Card>
        <div className="card__body space-y-4">
          <div className="management-grid">
            <Select
              label="Active lender"
              value={activeLenderId}
              onChange={(event) => setActiveLenderId(event.target.value)}
            >
              {activeLenders.map((lender) => (
                <option key={lender.id} value={lender.id}>
                  {lender.name || "Unnamed lender"}
                </option>
              ))}
            </Select>
            {!activeLenders.length && (
              <div className="text-sm text-amber-600">No active lenders available.</div>
            )}
          </div>

          {!activeLenders.length ? null : (
            <div className="space-y-4">
              {CATEGORY_DISPLAY_ORDER.map((category) => {
                const productsInCategory = visibleProducts.filter((product) => product.category === category);
                if (!productsInCategory.length) return null;
                return (
                  <div key={category} className="space-y-2">
                    <h3>{PORTAL_PRODUCT_CATEGORY_LABELS[category] ?? LENDER_PRODUCT_CATEGORY_LABELS[category]}</h3>
                    <Table
                      headers={[
                        "Product name",
                        "Lender",
                        "Submission",
                        "Active",
                        "Min - Max",
                        "Country",
                        "Rate type",
                        "Actions"
                      ]}
                    >
                      {productsInCategory.map((product) => {
                        const lender = activeLenders.find((item) => item.id === product.lenderId);
                        const isProductActive = Boolean(product.active);
                        const lenderMethod = lenderSubmissionMethods.get(product.lenderId) ?? "MANUAL";
                        return (
                          <tr key={product.id}>
                            <td>{product.productName}</td>
                            <td>{lender?.name ?? "—"}</td>
                            <td>{renderSubmissionMethodBadge(lenderMethod)}</td>
                            <td>
                              <span className={`status-pill status-pill--${isProductActive ? "active" : "paused"}`}>
                                {isProductActive ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td>
                              ${product.minAmount.toLocaleString()} - ${product.maxAmount.toLocaleString()}
                            </td>
                            <td>{formatLenderCountryLabel(product.country)}</td>
                            <td>{formatRateType(product.rateType)}</td>
                            <td>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  navigate(`/lender-products/${product.id}`);
                                }}
                              >
                                View
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingProduct(product);
                                  setSelectedProductId(product.id);
                                  setIsModalOpen(true);
                                }}
                              >
                                Edit
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </Table>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      <LenderProductModal
        isOpen={isModalOpen}
        title={editingProduct ? "Edit product" : "Add product"}
        isSaving={mutationLoading}
        errorMessage={submitError}
        lenderOptions={activeLenders.map((lender) => ({ value: lender.id, label: lender.name || "Unnamed lender" }))}
        formValues={formValues}
        formErrors={formErrors}
        categoryOptions={CATEGORY_DISPLAY_ORDER.map((category) => ({
          value: category,
          label: PORTAL_PRODUCT_CATEGORY_LABELS[category] ?? LENDER_PRODUCT_CATEGORY_LABELS[category]
        }))}
        rateTypes={RATE_TYPE_OPTIONS}
        documentOptions={PRODUCT_DOCUMENT_OPTIONS}
        formatRateType={formatRateType}
        onChange={updateForm}
        onSubmit={handleSubmit}
        onClose={closeModal}
        onCancel={closeModal}
        statusNote={
          submitError ? (
            <Button type="button" variant="secondary" onClick={handleSubmit} disabled={mutationLoading}>
              Retry save
            </Button>
          ) : null
        }
      />
    </div>
  );
};

const LenderProductsPage = () => (
  <RequireRole roles={["Admin", "Staff"]}>
    <LenderProductsContent />
  </RequireRole>
);

export default LenderProductsPage;
