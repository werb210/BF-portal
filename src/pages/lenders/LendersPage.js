import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
import LenderProductModal from "@/components/LenderProductModal";
import GoogleSheetMappingEditor, { createEmptyMappingRow } from "@/components/lenders/GoogleSheetMappingEditor";
import { createLender, createLenderProduct, fetchLenderById, fetchLenderProducts, fetchLenders, updateLender, updateLenderProduct } from "@/api/lenders";
import { ApiError } from "@/api";
import { getErrorMessage } from "@/utils/errors";
import { getRequestId } from "@/utils/requestId";
import { emitUiTelemetry } from "@/utils/uiTelemetry";
import { SUBMISSION_METHODS } from "@/types/lenderManagement.types";
import { SUBMISSION_METHOD_LABELS, getSubmissionMethodBadgeTone, getSubmissionMethodLabel } from "@/utils/submissionMethods";
import { LENDER_PRODUCT_CATEGORIES, LENDER_PRODUCT_CATEGORY_LABELS } from "@/types/lenderManagement.types";
import { PRODUCT_DOCUMENT_OPTIONS, buildRequiredDocumentsPayload, deriveCurrency, deriveProductName, formatInterestPayload, getDefaultRequiredDocuments, isValidVariableRate, normalizeCountrySelection, normalizeInterestInput, resolveRateType } from "./lenderProductForm";
const REQUIRED_IDENTIFIER_FIELDS = new Set(["business.legal_name", "owner.email"]);
const createEmptyLenderForm = () => ({
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
const emptyProductForm = (lenderId) => ({
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
const isValidEmail = (value) => value.includes("@");
const getApiErrorStatus = (error) => {
    if (error instanceof ApiError) {
        return error.status;
    }
    if (error && typeof error === "object" && "status" in error) {
        const status = error.status;
        return typeof status === "number" ? status : undefined;
    }
    return undefined;
};
const getApiErrorDetails = (error) => {
    if (error instanceof ApiError)
        return error.details;
    if (error && typeof error === "object" && "details" in error) {
        return error.details;
    }
    return undefined;
};
const extractValidationErrors = (error, fieldMap) => {
    const status = getApiErrorStatus(error);
    if (status !== 400 && status !== 422)
        return null;
    const details = getApiErrorDetails(error);
    if (!details || typeof details !== "object")
        return {};
    const rawErrors = details.errors ??
        details.fieldErrors ??
        details.fields ??
        details;
    if (!rawErrors || typeof rawErrors !== "object")
        return {};
    const nextErrors = {};
    Object.entries(rawErrors).forEach(([key, value]) => {
        const mappedKey = fieldMap[key] ?? fieldMap[key.toLowerCase()] ?? key;
        const message = Array.isArray(value)
            ? value
                .filter((item) => typeof item === "string" && item.trim().length > 0)
                .join(", ")
            : typeof value === "string"
                ? value
                : typeof value === "object" && value && "message" in value
                    ? String(value.message ?? "")
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
const normalizeLenderCountryValue = (value) => {
    const trimmed = typeof value === "string" ? value.trim() : "";
    if (!trimmed)
        return "";
    const normalized = trimmed.toUpperCase();
    if (normalized === "CA" || normalized === "CANADA")
        return "CA";
    if (normalized === "US" || normalized === "USA" || normalized === "UNITED STATES")
        return "US";
    if (normalized === "BOTH")
        return "BOTH";
    return trimmed;
};
const formatLenderCountryLabel = (value) => {
    const normalized = normalizeLenderCountryValue(value);
    if (!normalized)
        return "";
    return COUNTRIES.find((country) => country.value === normalized)?.label ?? value ?? "";
};
const toFormString = (value) => {
    if (value === null || value === undefined)
        return "";
    return String(value);
};
const toOptionalTrim = (value) => {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
};
const formatRateType = (value) => value.charAt(0).toUpperCase() + value.slice(1);
const normalizeSheetStatus = (value) => {
    const trimmed = value?.trim();
    if (!trimmed)
        return "";
    return trimmed.toUpperCase();
};
const getSheetStatusBadge = (value) => {
    const normalized = normalizeSheetStatus(value);
    if (normalized === "CONNECTED")
        return { label: "Connected", tone: "sent" };
    if (normalized === "ERROR")
        return { label: "Error", tone: "failed" };
    if (normalized)
        return { label: value ?? "Unknown", tone: "pending" };
    return { label: "Not connected", tone: "idle" };
};
const parseMappingPreview = (preview) => {
    if (!preview)
        return [createEmptyMappingRow()];
    try {
        const parsed = JSON.parse(preview);
        if (!Array.isArray(parsed))
            return [createEmptyMappingRow()];
        const rows = parsed
            .filter((entry) => entry && (entry.column || entry.field))
            .map((entry) => ({
            id: createEmptyMappingRow().id,
            columnName: entry.column ?? "",
            systemField: entry.field ?? ""
        }));
        return rows.length ? rows : [createEmptyMappingRow()];
    }
    catch {
        return [createEmptyMappingRow()];
    }
};
const buildMappingPreview = (rows) => {
    const mapped = rows
        .map((row) => ({ column: row.columnName.trim(), field: row.systemField.trim() }))
        .filter((row) => row.column || row.field);
    if (!mapped.length)
        return "";
    return JSON.stringify(mapped, null, 2);
};
const validateSheetMappings = (rows) => {
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
];
const PORTAL_PRODUCT_CATEGORY_LABELS = {
    LINE_OF_CREDIT: "Line of Credit",
    TERM_LOAN: "Term Loan",
    EQUIPMENT_FINANCE: "Equipment Financing",
    FACTORING: "Factoring",
    PURCHASE_ORDER_FINANCE: "Purchase Order Financing",
    STARTUP_CAPITAL: "Startup Financing"
};
const isPortalProductCategory = (value) => value === "STARTUP_CAPITAL" || PORTAL_PRODUCT_CATEGORIES.includes(value);
const getLenderStatus = (lender) => {
    if (!lender)
        return "INACTIVE";
    if (lender.status)
        return lender.status;
    if (typeof lender.active === "boolean")
        return lender.active ? "ACTIVE" : "INACTIVE";
    return "INACTIVE";
};
const isLenderActive = (lender) => getLenderStatus(lender) === "ACTIVE";
const getSubmissionBadgeLabel = (method) => method === "GOOGLE_SHEET" ? "Sheet-based submission" : getSubmissionMethodLabel(method);
const renderSubmissionMethodBadge = (method) => (_jsx("span", { className: `status-pill status-pill--submission-${getSubmissionMethodBadgeTone(method)}`, children: getSubmissionBadgeLabel(method) }));
const mapLenderToFormValues = (lender) => {
    const primaryContact = lender.primaryContact ?? {
        name: "",
        email: "",
        phone: ""
    };
    const submissionConfig = lender.submissionConfig ?? {
        method: "EMAIL",
        submissionEmail: "",
        sheetId: null,
        worksheetName: null,
        mappingPreview: null,
        sheetStatus: null,
        attachmentFormat: null,
        apiAuthType: null,
        apiBaseUrl: null,
        apiClientId: null,
        apiUsername: null,
        apiPassword: null
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
    const { data: lenders = [], isLoading, error, refetch: refetchLenders } = useQuery({
        queryKey: ["lenders"],
        queryFn: async ({ signal }) => (await fetchLenders({ signal })) ?? []
    });
    const safeLenders = Array.isArray(lenders) ? lenders : [];
    const [selectedLenderId, setSelectedLenderId] = useState(null);
    const [isLenderModalOpen, setIsLenderModalOpen] = useState(false);
    const [editingLenderId, setEditingLenderId] = useState(null);
    const [editingLender, setEditingLender] = useState(null);
    const [lenderFormValues, setLenderFormValues] = useState(createEmptyLenderForm());
    const [lenderFormErrors, setLenderFormErrors] = useState({});
    const [lenderSubmitError, setLenderSubmitError] = useState(null);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [productFormValues, setProductFormValues] = useState(emptyProductForm(""));
    const [productFormErrors, setProductFormErrors] = useState({});
    const [productSubmitError, setProductSubmitError] = useState(null);
    const canManageLenders = useAuthorization({ roles: ["Admin", "Staff"] });
    const selectedLender = useMemo(() => safeLenders.find((lender) => lender.id === selectedLenderId) ?? null, [safeLenders, selectedLenderId]);
    const isSelectedLenderInactive = !isLenderActive(selectedLender);
    const { data: lenderDetail, isLoading: lenderDetailLoading, error: lenderDetailError } = useQuery({
        queryKey: ["lender-detail", editingLenderId ?? "none"],
        queryFn: async () => (await fetchLenderById(editingLenderId ?? "")) ?? null,
        enabled: Boolean(editingLenderId && isLenderModalOpen)
    });
    const { data: products = [], isLoading: productsLoading, error: productsError, refetch: refetchProducts } = useQuery({
        queryKey: ["lender-products", selectedLenderId ?? "none"],
        queryFn: async ({ signal }) => (await fetchLenderProducts(selectedLenderId ?? "", { signal })) ?? [],
        enabled: Boolean(selectedLenderId),
        placeholderData: (previousData) => previousData ?? []
    });
    const safeProducts = Array.isArray(products) ? products : [];
    const hasSelectedLender = Boolean(selectedLender);
    const productsToRender = hasSelectedLender && !isSelectedLenderInactive ? safeProducts : [];
    const hasStartupCategory = productsToRender.some((product) => product.category === "STARTUP_CAPITAL") ||
        editingProduct?.category === "STARTUP_CAPITAL";
    const groupedProducts = useMemo(() => {
        const categories = hasStartupCategory
            ? [...PORTAL_PRODUCT_CATEGORIES, "STARTUP_CAPITAL"]
            : [...PORTAL_PRODUCT_CATEGORIES];
        const map = new Map();
        productsToRender.forEach((product) => {
            const category = product.category ?? LENDER_PRODUCT_CATEGORIES[0];
            const list = map.get(category) ?? [];
            list.push(product);
            map.set(category, list);
        });
        const extraCategories = Array.from(map.keys()).filter((category) => !isPortalProductCategory(category));
        const allCategories = [...categories, ...extraCategories];
        return allCategories
            .map((category) => ({
            category,
            label: (isPortalProductCategory(category) ? PORTAL_PRODUCT_CATEGORY_LABELS[category] : undefined) ??
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
        if (!lenderId)
            return;
        setSelectedLenderId(lenderId);
        setEditingLenderId(lenderId);
        setIsLenderModalOpen(true);
    }, [isNewRoute, lenderId]);
    useEffect(() => {
        if (!safeLenders.length)
            return;
        if (!selectedLenderId || !safeLenders.some((lender) => lender.id === selectedLenderId)) {
            const firstLender = safeLenders[0];
            setSelectedLenderId(firstLender?.id ?? null);
        }
    }, [safeLenders, selectedLenderId]);
    useEffect(() => {
        if (lenderDetail && editingLenderId && lenderDetail.id === editingLenderId) {
            setEditingLender(lenderDetail);
            queryClient.setQueryData(["lenders"], (current = []) => current.map((lender) => (lender.id === lenderDetail.id ? lenderDetail : lender)));
        }
    }, [editingLenderId, lenderDetail, queryClient]);
    useEffect(() => {
        if (!isLenderModalOpen)
            return;
        if (editingLenderId) {
            if (!lenderDetail)
                return;
            setLenderFormValues(mapLenderToFormValues(lenderDetail));
            setLenderFormErrors({});
            setLenderSubmitError(null);
            return;
        }
        setLenderFormValues(createEmptyLenderForm());
        setLenderFormErrors({});
        setLenderSubmitError(null);
    }, [editingLenderId, isLenderModalOpen, lenderDetail]);
    const lenderFieldMap = useMemo(() => ({
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
    }), []);
    const productFieldMap = useMemo(() => ({
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
    }), []);
    const createLenderMutation = useMutation({
        mutationFn: (payload) => createLender(payload),
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
        mutationFn: ({ lenderId, payload }) => updateLender(lenderId, payload),
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
        mutationFn: (payload) => createLenderProduct(payload),
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
        mutationFn: ({ productId, payload }) => updateLenderProduct(productId, payload),
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
    const rateTypeOptions = ["fixed", "variable"];
    const activeLenderOptions = safeLenders
        .filter((lender) => isLenderActive(lender))
        .map((lender) => ({
        value: lender.id,
        label: lender.name || "Unnamed lender"
    }));
    const selectedLenderOption = selectedLender && !isLenderActive(selectedLender)
        ? {
            value: selectedLender.id,
            label: `${selectedLender.name || "Unnamed lender"} (Inactive)`,
            disabled: true
        }
        : null;
    const lenderOptions = selectedLenderOption ? [selectedLenderOption, ...activeLenderOptions] : activeLenderOptions;
    const validateLenderForm = (values) => {
        const nextErrors = {};
        if (!values.name.trim())
            nextErrors.name = "Name is required.";
        if (!values.country.trim())
            nextErrors.country = "Country is required.";
        if (!values.primaryContactName.trim())
            nextErrors.primaryContactName = "Primary contact name is required.";
        if (!values.primaryContactEmail.trim()) {
            nextErrors.primaryContactEmail = "Primary contact email is required.";
        }
        else if (!isValidEmail(values.primaryContactEmail)) {
            nextErrors.primaryContactEmail = "Enter a valid email.";
        }
        if (!values.submissionMethod)
            nextErrors.submissionMethod = "Submission method is required.";
        if (values.submissionMethod === "EMAIL" && !values.submissionEmail.trim()) {
            nextErrors.submissionEmail = "Target email address is required.";
        }
        else if (values.submissionMethod === "EMAIL" && !isValidEmail(values.submissionEmail)) {
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
    const buildLenderPayload = (values) => ({
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
        submission_attachment_format: values.submissionMethod === "EMAIL" ? values.submissionAttachmentFormat : null,
        submission_sheet_id: values.submissionMethod === "GOOGLE_SHEET" ? toOptionalTrim(values.submissionSheetId) : null,
        submission_worksheet_name: values.submissionMethod === "GOOGLE_SHEET" ? toOptionalTrim(values.submissionWorksheetName) : null,
        submission_mapping_preview: values.submissionMethod === "GOOGLE_SHEET" ? toOptionalTrim(values.submissionMappingPreview) : null,
        submission_sheet_status: values.submissionMethod === "GOOGLE_SHEET" ? toOptionalTrim(values.submissionSheetStatus) : null,
        submission_api_endpoint: values.submissionMethod === "API" ? toOptionalTrim(values.submissionApiEndpoint) : null,
        submission_api_auth_type: values.submissionMethod === "API" ? values.submissionApiAuthType : null
    });
    const validateProductForm = (values) => {
        const errors = {};
        if (!values.lenderId)
            errors.lenderId = "Lender is required.";
        const isActiveLender = safeLenders.some((lender) => lender.id === values.lenderId && isLenderActive(lender));
        if (values.lenderId && !isActiveLender) {
            errors.lenderId = "Lender must be active.";
        }
        if (!values.productName.trim())
            errors.productName = "Product name is required.";
        if (!values.category)
            errors.category = "Product category is required.";
        if (!values.country.length)
            errors.country = "Country is required.";
        if (!values.minAmount)
            errors.minAmount = "Minimum amount is required.";
        if (!values.maxAmount)
            errors.maxAmount = "Maximum amount is required.";
        const minAmount = Number(values.minAmount);
        const maxAmount = Number(values.maxAmount);
        if (Number.isNaN(minAmount))
            errors.minAmount = "Minimum amount must be a number.";
        if (Number.isNaN(maxAmount))
            errors.maxAmount = "Maximum amount must be a number.";
        if (!Number.isNaN(minAmount) && !Number.isNaN(maxAmount) && minAmount > maxAmount) {
            errors.maxAmount = "Maximum amount must be greater than minimum.";
        }
        if (!values.minTerm)
            errors.minTerm = "Minimum term is required.";
        if (!values.maxTerm)
            errors.maxTerm = "Maximum term is required.";
        const minTerm = Number(values.minTerm);
        const maxTerm = Number(values.maxTerm);
        if (Number.isNaN(minTerm))
            errors.minTerm = "Minimum term must be a number.";
        if (Number.isNaN(maxTerm))
            errors.maxTerm = "Maximum term must be a number.";
        if (!Number.isNaN(minTerm) && !Number.isNaN(maxTerm) && minTerm > maxTerm) {
            errors.maxTerm = "Maximum term must be greater than minimum.";
        }
        if (!values.rateType)
            errors.rateType = "Rate type is required.";
        if (!values.interestMin)
            errors.interestMin = "Interest minimum is required.";
        if (!values.interestMax)
            errors.interestMax = "Interest maximum is required.";
        if (values.rateType === "variable") {
            if (values.interestMin && !isValidVariableRate(values.interestMin)) {
                errors.interestMin = "Use format Prime + X%.";
            }
            if (values.interestMax && !isValidVariableRate(values.interestMax)) {
                errors.interestMax = "Use format Prime + Y%.";
            }
        }
        else {
            const interestMin = Number(values.interestMin);
            const interestMax = Number(values.interestMax);
            if (Number.isNaN(interestMin))
                errors.interestMin = "Interest minimum must be a number.";
            if (Number.isNaN(interestMax))
                errors.interestMax = "Interest maximum must be a number.";
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
    const buildProductPayload = (values, existing) => {
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
    const updateProductForm = (updates) => {
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
        if (!canManageLenders)
            return;
        const errors = validateProductForm(productFormValues);
        setProductFormErrors(errors);
        if (Object.keys(errors).length)
            return;
        const payload = buildProductPayload(productFormValues, editingProduct);
        if (editingProduct?.id) {
            updateProductMutation.mutate({ productId: editingProduct.id, payload });
            return;
        }
        createProductMutation.mutate(payload);
    };
    const handleLenderSubmit = () => {
        if (!canManageLenders)
            return;
        const errors = validateLenderForm(lenderFormValues);
        setLenderFormErrors(errors);
        if (Object.keys(errors).length)
            return;
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
    const openEditModal = (lenderIdValue) => {
        setEditingLenderId(lenderIdValue);
        setIsLenderModalOpen(true);
    };
    const closeProductModal = () => {
        setIsProductModalOpen(false);
        setEditingProduct(null);
        setProductSubmitError(null);
        setProductFormErrors({});
    };
    const handleLenderSelection = (lenderIdValue) => {
        if (lenderIdValue === selectedLenderId)
            return;
        setSelectedLenderId(lenderIdValue);
        setEditingLender(null);
    };
    const handleAddProduct = () => {
        if (!selectedLender?.id)
            return;
        setEditingProduct(null);
        setIsProductModalOpen(true);
        setProductFormValues(emptyProductForm(selectedLender.id));
        setProductFormErrors({});
    };
    const handleEditProduct = (product) => {
        setEditingProduct(product);
        setIsProductModalOpen(true);
        setProductFormErrors({});
    };
    if (isLoading || productsLoading)
        return _jsx(AppLoading, {});
    if (error || productsError) {
        return (_jsx(ErrorBanner, { message: getErrorMessage(error ?? productsError, "Unable to load lender data."), onRetry: () => {
                refetchLenders();
                refetchProducts();
            } }));
    }
    const handleMappingChange = (rows) => {
        setLenderFormValues((prev) => ({
            ...prev,
            submissionMappings: rows,
            submissionMappingPreview: buildMappingPreview(rows)
        }));
    };
    return (_jsxs("div", { className: "page page--lenders", children: [_jsxs("div", { className: "page-header", children: [_jsxs("div", { children: [_jsx("h1", { children: "Lenders" }), _jsx("p", { className: "page-header__subtitle", children: "Manage lender details and submission settings." })] }), _jsx(ActionGate, { actions: ["create_lender"], children: _jsx(Button, { variant: "primary", onClick: () => {
                                setEditingLender(null);
                                setEditingLenderId(null);
                                setIsLenderModalOpen(true);
                                setLenderFormValues(createEmptyLenderForm());
                                setLenderFormErrors({});
                            }, children: "Create lender" }) })] }), _jsxs("div", { className: "page-grid", children: [_jsx(Card, { children: _jsx("div", { className: "card__body", children: !safeLenders.length ? (_jsx("div", { className: "text-sm text-slate-500", children: "No lenders added yet." })) : (_jsxs("div", { className: "management-grid", children: [_jsx(Select, { label: "Lender", value: selectedLenderId ?? "", onChange: (event) => handleLenderSelection(event.target.value), children: safeLenders.map((lender) => (_jsx("option", { value: lender.id, children: lender.name || "Unnamed lender" }, lender.id))) }), selectedLender && (_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx("span", { className: `status-pill status-pill--${isLenderActive(selectedLender) ? "active" : "paused"}`, children: isLenderActive(selectedLender) ? "Lender active" : "Lender inactive" }), _jsx("span", { children: formatLenderCountryLabel(selectedLender.address?.country) || "—" }), !isLenderActive(selectedLender) && (_jsx("span", { className: "text-xs text-amber-600", children: "Inactive lenders hide products." }))] })), selectedLender ? (_jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsx(Button, { variant: "secondary", onClick: () => openEditModal(selectedLender.id), children: "Edit lender" }), _jsx(Button, { variant: "secondary", onClick: handleAddProduct, disabled: isSelectedLenderInactive, children: "Add product" })] })) : null] })) }) }), _jsx(Card, { children: _jsx("div", { className: "card__body", children: hasSelectedLender && !isSelectedLenderInactive ? (_jsxs("div", { className: "space-y-4", children: [groupedProducts.map((group) => (_jsxs("div", { children: [_jsx("h3", { className: "text-lg font-semibold", children: group.label }), _jsx("div", { className: "mt-2", children: _jsx(Table, { headers: ["Product", "Country", "Submission", "Status", "Min/Max"], children: group.products.map((product) => {
                                                        const productActive = Boolean(product.active);
                                                        const minAmount = product.minAmount || 0;
                                                        const maxAmount = product.maxAmount || 0;
                                                        return (_jsxs("tr", { children: [_jsx("td", { children: _jsx("button", { type: "button", className: "text-left text-sm font-medium text-slate-900 hover:underline", onClick: () => handleEditProduct(product), children: product.productName }) }), _jsx("td", { children: formatLenderCountryLabel(product.country) || "—" }), _jsx("td", { children: renderSubmissionMethodBadge(selectedLender?.submissionConfig?.method ?? "MANUAL") }), _jsx("td", { children: _jsx("span", { className: `status-pill status-pill--${productActive ? "active" : "paused"}`, children: productActive ? "Active" : "Inactive" }) }), _jsxs("td", { children: ["$", minAmount.toLocaleString(), " - $", maxAmount.toLocaleString()] })] }, product.id));
                                                    }) }) })] }, group.category))), !productsToRender.length && (_jsx("div", { className: "text-sm text-slate-500", children: "No products for this lender." }))] })) : (_jsx("div", { className: "text-sm text-slate-500", children: hasSelectedLender
                                    ? "This lender is inactive, so products are hidden."
                                    : "Select a lender to view products." })) }) })] }), isLenderModalOpen && (_jsxs(Modal, { title: editingLender ? "Edit lender" : "Create lender", onClose: closeLenderModal, children: [lenderDetailLoading && editingLenderId && _jsx(AppLoading, {}), lenderDetailError && (_jsx(ErrorBanner, { message: getErrorMessage(lenderDetailError, "Unable to load lender details.") })), lenderSubmitError && (_jsxs("div", { className: "space-y-2", children: [_jsx(ErrorBanner, { message: lenderSubmitError }), _jsx(Button, { type: "button", variant: "secondary", onClick: handleLenderSubmit, disabled: mutationLoading, children: "Retry save" })] })), _jsxs("form", { className: "management-form", onSubmit: (event) => {
                            event.preventDefault();
                            handleLenderSubmit();
                        }, children: [_jsxs("div", { className: "management-field", children: [_jsx("span", { className: "management-field__label", children: "Lender details" }), _jsx(Input, { label: "Lender name", value: lenderFormValues.name, onChange: (event) => setLenderFormValues((prev) => ({ ...prev, name: event.target.value })), error: lenderFormErrors.name }), _jsx(Select, { label: "Country", value: lenderFormValues.country, onChange: (event) => setLenderFormValues((prev) => ({
                                            ...prev,
                                            country: event.target.value
                                        })), children: COUNTRIES.map((country) => (_jsx("option", { value: country.value, children: country.label }, country.value))) }), lenderFormErrors.country && _jsx("span", { className: "ui-field__error", children: lenderFormErrors.country }), _jsxs("label", { className: "management-toggle", children: [_jsx("input", { type: "checkbox", checked: lenderFormValues.active, onChange: (event) => setLenderFormValues((prev) => ({ ...prev, active: event.target.checked })) }), _jsx("span", { children: "Active lender" })] })] }), _jsxs("div", { className: "management-field", children: [_jsx("span", { className: "management-field__label", children: "Primary contact" }), _jsx(Input, { label: "Contact name", value: lenderFormValues.primaryContactName, onChange: (event) => setLenderFormValues((prev) => ({ ...prev, primaryContactName: event.target.value })), error: lenderFormErrors.primaryContactName }), _jsx(Input, { label: "Contact email", value: lenderFormValues.primaryContactEmail, onChange: (event) => setLenderFormValues((prev) => ({ ...prev, primaryContactEmail: event.target.value })), error: lenderFormErrors.primaryContactEmail }), _jsx("div", { className: "management-grid__row", children: _jsx(Input, { label: "Contact phone", value: lenderFormValues.primaryContactPhone, onChange: (event) => setLenderFormValues((prev) => ({ ...prev, primaryContactPhone: event.target.value })) }) })] }), _jsxs("div", { className: "management-field", children: [_jsx("span", { className: "management-field__label", children: "Additional details" }), _jsx(Input, { label: "Website", value: lenderFormValues.website, onChange: (event) => setLenderFormValues((prev) => ({ ...prev, website: event.target.value })) }), _jsxs("label", { className: "ui-field", children: [_jsx("span", { className: "ui-field__label", children: "Notes (internal only)" }), _jsx("textarea", { className: "ui-input ui-textarea", value: lenderFormValues.internalNotes, onChange: (event) => setLenderFormValues((prev) => ({ ...prev, internalNotes: event.target.value })) })] })] }), _jsxs("div", { className: "management-field", children: [_jsx("span", { className: "management-field__label", children: "Submission method" }), _jsx(Select, { label: "Submission method", value: lenderFormValues.submissionMethod, onChange: (event) => setLenderFormValues((prev) => ({
                                            ...prev,
                                            submissionMethod: event.target.value
                                        })), children: SUBMISSION_METHODS.map((method) => (_jsx("option", { value: method, children: SUBMISSION_METHOD_LABELS[method] }, method))) }), lenderFormErrors.submissionMethod && (_jsx("span", { className: "ui-field__error", children: lenderFormErrors.submissionMethod })), lenderFormValues.submissionMethod === "GOOGLE_SHEET" && (_jsxs("div", { className: "space-y-3", children: [_jsx(Input, { label: "Google Sheet ID", value: lenderFormValues.submissionSheetId, onChange: (event) => setLenderFormValues((prev) => ({ ...prev, submissionSheetId: event.target.value })), error: lenderFormErrors.submissionSheetId }), _jsx(Input, { label: "Sheet tab name", value: lenderFormValues.submissionWorksheetName, onChange: (event) => setLenderFormValues((prev) => ({ ...prev, submissionWorksheetName: event.target.value })), error: lenderFormErrors.submissionWorksheetName }), _jsxs("div", { className: "ui-field", children: [_jsx("span", { className: "ui-field__label", children: "Column mapping editor" }), _jsx(GoogleSheetMappingEditor, { rows: lenderFormValues.submissionMappings, onChange: handleMappingChange, error: lenderFormErrors.submissionMappingPreview })] }), _jsxs("div", { className: "ui-field", children: [_jsx("span", { className: "ui-field__label", children: "Status" }), (() => {
                                                        const status = getSheetStatusBadge(lenderFormValues.submissionSheetStatus);
                                                        return _jsx("span", { className: `status-pill status-pill--${status.tone}`, children: status.label });
                                                    })()] })] })), lenderFormValues.submissionMethod === "EMAIL" && (_jsxs("div", { className: "space-y-3", children: [_jsx(Input, { label: "Target email address", value: lenderFormValues.submissionEmail, onChange: (event) => setLenderFormValues((prev) => ({ ...prev, submissionEmail: event.target.value })), error: lenderFormErrors.submissionEmail }), _jsxs(Select, { label: "Attachment format", value: lenderFormValues.submissionAttachmentFormat, onChange: (event) => setLenderFormValues((prev) => ({
                                                    ...prev,
                                                    submissionAttachmentFormat: event.target.value
                                                })), children: [_jsx("option", { value: "PDF", children: "PDF" }), _jsx("option", { value: "CSV", children: "CSV" })] })] })), lenderFormValues.submissionMethod === "API" && (_jsxs("div", { className: "space-y-3", children: [_jsx(Input, { label: "Endpoint", type: "password", value: lenderFormValues.submissionApiEndpoint, placeholder: "https://api.example.com", onChange: (event) => setLenderFormValues((prev) => ({ ...prev, submissionApiEndpoint: event.target.value })) }), _jsxs(Select, { label: "Auth type", value: lenderFormValues.submissionApiAuthType, onChange: (event) => setLenderFormValues((prev) => ({
                                                    ...prev,
                                                    submissionApiAuthType: event.target.value
                                                })), children: [_jsx("option", { value: "token", children: "Token" }), _jsx("option", { value: "key", children: "Key" })] })] })), lenderFormValues.submissionMethod === "MANUAL" && (_jsx("p", { className: "text-xs text-slate-500", children: "Manual submissions are tracked internally only." }))] }), _jsx("div", { className: "management-actions", children: _jsx(Button, { type: "submit", disabled: mutationLoading, children: editingLender ? "Save changes" : "Create lender" }) })] })] })), isProductModalOpen && selectedLender && (_jsx(LenderProductModal, { isOpen: isProductModalOpen, title: editingProduct ? "Edit product" : "Add product", isSaving: productMutationLoading, isSubmitDisabled: isSelectedLenderInactive, errorMessage: productSubmitError, lenderOptions: lenderOptions, formValues: productFormValues, formErrors: productFormErrors, categoryOptions: buildCategoryOptions(hasStartupCategory), rateTypes: rateTypeOptions, documentOptions: PRODUCT_DOCUMENT_OPTIONS, formatRateType: formatRateType, onChange: updateProductForm, onSubmit: handleProductSubmit, onClose: closeProductModal, onCancel: closeProductModal, statusNote: _jsxs("div", { className: "space-y-2", children: [isSelectedLenderInactive && (_jsx("p", { className: "text-xs text-amber-600", children: "This lender is inactive. Products will remain inactive until the lender is active again." })), productSubmitError && (_jsx(Button, { type: "button", variant: "secondary", onClick: handleProductSubmit, disabled: productMutationLoading, children: "Retry save" }))] }) }))] }));
};
const buildCategoryOptions = (hasStartupCategory) => {
    const categories = hasStartupCategory
        ? [...PORTAL_PRODUCT_CATEGORIES, "STARTUP_CAPITAL"]
        : [...PORTAL_PRODUCT_CATEGORIES];
    return categories.map((category) => ({
        value: category,
        label: PORTAL_PRODUCT_CATEGORY_LABELS[category] ?? LENDER_PRODUCT_CATEGORY_LABELS[category]
    }));
};
const LendersPage = () => (_jsx(RequireRole, { roles: ["Admin", "Staff"], children: _jsx(ErrorBoundary, { children: _jsx(LendersContent, {}) }) }));
export default LendersPage;
