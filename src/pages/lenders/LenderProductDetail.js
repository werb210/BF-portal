import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// @ts-nocheck
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "react-router-dom";
import Card from "@/components/ui/Card";
import Table from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import ErrorBanner from "@/components/ui/ErrorBanner";
import AppLoading from "@/components/layout/AppLoading";
import { getErrorMessage } from "@/utils/errors";
import { getSubmissionMethodBadgeTone, getSubmissionMethodLabel } from "@/utils/submissionMethods";
import { createLenderProductRequirement, deleteLenderProductRequirement, fetchClientLenderProductRequirements, fetchLenderProductById, fetchLenders, updateLenderProductRequirement } from "@/api/lenders";
import { LENDER_PRODUCT_CATEGORY_LABELS } from "@/types/lenderManagement.types";
const toOptionalNumber = (value) => {
    if (!value.trim())
        return null;
    const parsed = Number(value);
    if (Number.isNaN(parsed))
        return null;
    return parsed;
};
const toRow = (requirement) => ({
    id: requirement.id,
    documentType: requirement.documentType ?? "",
    required: requirement.required,
    minAmount: requirement.minAmount === null ? "" : requirement.minAmount.toString(),
    maxAmount: requirement.maxAmount === null ? "" : requirement.maxAmount.toString(),
    isEditing: false,
    isNew: false,
    error: null
});
const validateRow = (row) => {
    if (!row.documentType.trim())
        return "Document type is required.";
    const minAmount = toOptionalNumber(row.minAmount);
    const maxAmount = toOptionalNumber(row.maxAmount);
    if (row.minAmount.trim() && minAmount === null)
        return "Minimum amount must be a number.";
    if (row.maxAmount.trim() && maxAmount === null)
        return "Maximum amount must be a number.";
    if (minAmount !== null && maxAmount !== null && minAmount > maxAmount) {
        return "Minimum amount must be less than or equal to maximum.";
    }
    return null;
};
const getSubmissionBadgeLabel = (method) => method === "GOOGLE_SHEET" ? "Sheet-based submission" : getSubmissionMethodLabel(method);
const getSubmissionConfigSummary = (config) => {
    if (!config?.method)
        return "—";
    switch (config.method) {
        case "GOOGLE_SHEET": {
            const spreadsheetName = config.sheetStatus?.trim() || "Google Sheet";
            const sheetTab = config.worksheetName?.trim() || "—";
            return `Spreadsheet: ${spreadsheetName} • Sheet: ${sheetTab}`;
        }
        case "EMAIL":
            return `Email: ${config.submissionEmail ?? "—"}`;
        case "API":
            return `Endpoint: ${config.apiBaseUrl ?? "—"}`;
        default:
            return "—";
    }
};
const LenderProductDetail = () => {
    const { productId } = useParams();
    const location = useLocation();
    const queryClient = useQueryClient();
    const requirementsRef = useRef(null);
    const [rows, setRows] = useState([]);
    const [saveError, setSaveError] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const { data: product, isLoading: productLoading, error: productError } = useQuery({
        queryKey: ["lender-product", productId],
        queryFn: () => fetchLenderProductById(productId ?? ""),
        enabled: Boolean(productId)
    });
    const { data: lenders = [], isLoading: lendersLoading, error: lendersError } = useQuery({
        queryKey: ["lenders"],
        queryFn: ({ signal }) => fetchLenders({ signal }),
        staleTime: 30_000,
        refetchOnWindowFocus: false
    });
    const { data: requirementsData, isLoading: requirementsLoading, error: requirementsError } = useQuery({
        queryKey: ["lender-product-requirements", productId],
        queryFn: () => fetchClientLenderProductRequirements(productId ?? ""),
        enabled: Boolean(productId)
    });
    const deleteMutation = useMutation({
        mutationFn: ({ requirementId }) => deleteLenderProductRequirement(productId ?? "", requirementId),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["lender-product-requirements", productId] });
        }
    });
    useEffect(() => {
        if (!requirementsData?.requirements)
            return;
        setRows(requirementsData.requirements.map(toRow));
    }, [requirementsData]);
    useEffect(() => {
        if (!location.pathname.endsWith("/requirements"))
            return;
        requirementsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, [location.pathname]);
    const lenderName = useMemo(() => {
        if (!product)
            return "";
        return lenders.find((lender) => lender.id === product.lenderId)?.name ?? "";
    }, [lenders, product]);
    const lenderSubmissionConfig = useMemo(() => {
        if (!product)
            return null;
        return lenders.find((lender) => lender.id === product.lenderId)?.submissionConfig ?? null;
    }, [lenders, product]);
    const lenderSubmissionMethod = lenderSubmissionConfig?.method ?? "MANUAL";
    const documentTypeOptions = useMemo(() => {
        const source = new Set();
        requirementsData?.documentTypes?.forEach((type) => source.add(type));
        rows.forEach((row) => {
            if (row.documentType.trim())
                source.add(row.documentType.trim());
        });
        return Array.from(source.values()).sort();
    }, [requirementsData, rows]);
    const requiredCount = useMemo(() => rows.filter((row) => row.required).length, [rows]);
    const hasEdits = rows.some((row) => row.isEditing);
    const handleAddRequirement = () => {
        const tempId = `new-${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Date.now().toString()}`;
        setRows((prev) => [
            ...prev,
            {
                id: tempId,
                documentType: "",
                required: true,
                minAmount: "",
                maxAmount: "",
                isEditing: true,
                isNew: true,
                error: null
            }
        ]);
    };
    const handleSave = async () => {
        if (!productId)
            return;
        setSaveError(null);
        const validated = rows.map((row) => ({ ...row, error: row.isEditing ? validateRow(row) : row.error }));
        setRows(validated);
        if (validated.some((row) => row.error))
            return;
        if (validated.filter((row) => row.required).length === 0) {
            setSaveError("At least one required document must remain required.");
            return;
        }
        const editedRows = validated.filter((row) => row.isEditing);
        if (!editedRows.length)
            return;
        setIsSaving(true);
        let hasError = false;
        for (const row of editedRows) {
            try {
                const payload = {
                    document_type: row.documentType.trim(),
                    required: row.required,
                    min_amount: toOptionalNumber(row.minAmount),
                    max_amount: toOptionalNumber(row.maxAmount)
                };
                const saved = row.isNew
                    ? await createLenderProductRequirement(productId, payload)
                    : await updateLenderProductRequirement(productId, row.id, payload);
                setRows((prev) => prev.map((item) => item.id === row.id
                    ? {
                        ...item,
                        id: saved.id,
                        documentType: saved.documentType,
                        required: saved.required,
                        minAmount: saved.minAmount === null ? "" : saved.minAmount.toString(),
                        maxAmount: saved.maxAmount === null ? "" : saved.maxAmount.toString(),
                        isEditing: false,
                        isNew: false,
                        error: null
                    }
                    : item));
            }
            catch (error) {
                hasError = true;
                setRows((prev) => prev.map((item) => item.id === row.id
                    ? { ...item, error: getErrorMessage(error, "Unable to save requirement.") }
                    : item));
            }
        }
        setIsSaving(false);
        if (!hasError) {
            queryClient.invalidateQueries({ queryKey: ["lender-product-requirements", productId] });
        }
    };
    const handleDelete = (id) => {
        deleteMutation.mutate({ requirementId: id });
    };
    if (productLoading || lendersLoading || requirementsLoading)
        return _jsx(AppLoading, {});
    if (productError || lendersError || requirementsError) {
        return (_jsx(ErrorBanner, { message: getErrorMessage(productError ?? lendersError ?? requirementsError, "Unable to load product details.") }));
    }
    if (!product) {
        return _jsx(ErrorBanner, { message: "Unable to load product details." });
    }
    return (_jsxs("div", { className: "page page--lender-product-detail", children: [_jsx("div", { className: "page-header", children: _jsxs("div", { children: [_jsx("h1", { children: product.productName }), _jsx("p", { className: "page-header__subtitle", children: lenderName })] }) }), _jsxs("div", { className: "page-grid", children: [_jsx(Card, { children: _jsxs("div", { className: "card__body space-y-4", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx("span", { className: `status-pill status-pill--submission-${getSubmissionMethodBadgeTone(lenderSubmissionMethod)}`, children: getSubmissionBadgeLabel(lenderSubmissionMethod) }), _jsx("span", { className: "status-pill status-pill--active", children: "Active" })] }), _jsxs("div", { className: "grid grid-cols-1 gap-4 md:grid-cols-2", children: [_jsxs("div", { children: [_jsx("div", { className: "text-xs uppercase text-slate-400", children: "Category" }), _jsx("div", { children: LENDER_PRODUCT_CATEGORY_LABELS[product.category] ?? product.category })] }), _jsxs("div", { children: [_jsx("div", { className: "text-xs uppercase text-slate-400", children: "Country" }), _jsx("div", { children: product.country })] }), _jsxs("div", { children: [_jsx("div", { className: "text-xs uppercase text-slate-400", children: "Amount range" }), _jsxs("div", { children: ["$", product.minAmount.toLocaleString(), " - $", product.maxAmount.toLocaleString()] })] }), _jsxs("div", { children: [_jsx("div", { className: "text-xs uppercase text-slate-400", children: "Rate type" }), _jsx("div", { children: product.rateType })] }), _jsxs("div", { children: [_jsx("div", { className: "text-xs uppercase text-slate-400", children: "Submission method" }), _jsx("div", { children: getSubmissionMethodLabel(lenderSubmissionMethod) })] }), _jsxs("div", { children: [_jsx("div", { className: "text-xs uppercase text-slate-400", children: "Submission config" }), _jsx("div", { children: getSubmissionConfigSummary(lenderSubmissionConfig ?? undefined) })] })] })] }) }), _jsx(Card, { children: _jsxs("div", { className: "card__body space-y-4", ref: requirementsRef, children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-2", children: [_jsxs("div", { children: [_jsx("h2", { children: "Required documents" }), _jsxs("p", { className: "text-sm text-slate-500", children: [requiredCount, " required document", requiredCount === 1 ? "" : "s"] })] }), _jsx(Button, { variant: "secondary", onClick: handleAddRequirement, children: "Add requirement" })] }), saveError && _jsx(ErrorBanner, { message: saveError }), _jsx(Table, { headers: ["Document type", "Required", "Min amount", "Max amount", "Actions"], children: rows.map((row) => (_jsxs("tr", { children: [_jsxs("td", { children: [row.isEditing ? (_jsx(Input, { value: row.documentType, onChange: (event) => setRows((prev) => prev.map((item) => item.id === row.id ? { ...item, documentType: event.target.value, error: null } : item)) })) : (row.documentType), row.error && _jsx("div", { className: "text-xs text-red-600", children: row.error })] }), _jsx("td", { children: row.isEditing ? (_jsxs(Select, { value: row.required ? "required" : "optional", onChange: (event) => setRows((prev) => prev.map((item) => item.id === row.id
                                                        ? { ...item, required: event.target.value === "required", error: null }
                                                        : item)), children: [_jsx("option", { value: "required", children: "Required" }), _jsx("option", { value: "optional", children: "Optional" })] })) : row.required ? ("Required") : ("Optional") }), _jsx("td", { children: row.isEditing ? (_jsx(Input, { value: row.minAmount, onChange: (event) => setRows((prev) => prev.map((item) => item.id === row.id ? { ...item, minAmount: event.target.value, error: null } : item)) })) : (row.minAmount || "—") }), _jsx("td", { children: row.isEditing ? (_jsx(Input, { value: row.maxAmount, onChange: (event) => setRows((prev) => prev.map((item) => item.id === row.id ? { ...item, maxAmount: event.target.value, error: null } : item)) })) : (row.maxAmount || "—") }), _jsx("td", { children: row.isEditing ? (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Button, { variant: "primary", size: "sm", onClick: handleSave, disabled: isSaving, children: "Save" }), _jsx(Button, { variant: "ghost", size: "sm", onClick: () => setRows((prev) => prev.map((item) => item.id === row.id
                                                                ? { ...item, isEditing: false, error: null, isNew: false }
                                                                : item)), children: "Cancel" })] })) : (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Button, { variant: "ghost", size: "sm", onClick: () => setRows((prev) => prev.map((item) => item.id === row.id ? { ...item, isEditing: true, error: null } : item)), children: "Edit" }), _jsx(Button, { variant: "ghost", size: "sm", onClick: () => handleDelete(row.id), children: "Delete" })] })) })] }, row.id))) }), documentTypeOptions.length ? (_jsxs("div", { className: "text-xs text-slate-500", children: ["Suggested document types: ", documentTypeOptions.join(", ")] })) : null, hasEdits && (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Button, { variant: "primary", onClick: handleSave, disabled: isSaving, children: "Save changes" }), _jsx(Button, { variant: "ghost", onClick: () => setRows((prev) => prev.map((row) => ({ ...row, isEditing: false, error: null }))), children: "Cancel edits" })] }))] }) })] })] }));
};
export default LenderProductDetail;
