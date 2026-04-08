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
import {
  createLenderProductRequirement,
  deleteLenderProductRequirement,
  fetchClientLenderProductRequirements,
  fetchLenderProductById,
  fetchLenders,
  updateLenderProductRequirement,
  type LenderProductRequirement
} from "@/api/lenders";
import { LENDER_PRODUCT_CATEGORY_LABELS } from "@/types/lenderManagement.types";

type RequirementRow = {
  id: string;
  documentType: string;
  required: boolean;
  minAmount: string;
  maxAmount: string;
  isEditing: boolean;
  isNew: boolean;
  error?: string | null;
};

const toOptionalNumber = (value: string) => {
  if (!value.trim()) return null;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return null;
  return parsed;
};

const toRow = (requirement: LenderProductRequirement): RequirementRow => ({
  id: requirement.id,
  documentType: requirement.documentType ?? "",
  required: requirement.required,
  minAmount: requirement.minAmount === null ? "" : requirement.minAmount.toString(),
  maxAmount: requirement.maxAmount === null ? "" : requirement.maxAmount.toString(),
  isEditing: false,
  isNew: false,
  error: null
});

const validateRow = (row: RequirementRow) => {
  if (!row.documentType.trim()) return "Document type is required.";
  const minAmount = toOptionalNumber(row.minAmount);
  const maxAmount = toOptionalNumber(row.maxAmount);
  if (row.minAmount.trim() && minAmount === null) return "Minimum amount must be a number.";
  if (row.maxAmount.trim() && maxAmount === null) return "Maximum amount must be a number.";
  if (minAmount !== null && maxAmount !== null && minAmount > maxAmount) {
    return "Minimum amount must be less than or equal to maximum.";
  }
  return null;
};

const getSubmissionBadgeLabel = (method?: string | null) =>
  method === "GOOGLE_SHEET" ? "Sheet-based submission" : getSubmissionMethodLabel(method);

const getSubmissionConfigSummary = (config?: { method?: string | null; worksheetName?: string | null; submissionEmail?: string | null; apiBaseUrl?: string | null; sheetStatus?: string | null }) => {
  if (!config?.method) return "—";
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
  const requirementsRef = useRef<HTMLDivElement | null>(null);
  const [rows, setRows] = useState<RequirementRow[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const {
    data: product,
    isLoading: productLoading,
    error: productError
  } = useQuery({
    queryKey: ["lender-product", productId],
    queryFn: () => fetchLenderProductById(productId ?? ""),
    enabled: Boolean(productId)
  });

  const {
    data: lenders = [],
    isLoading: lendersLoading,
    error: lendersError
  } = useQuery({
    queryKey: ["lenders"],
    queryFn: ({ signal }) => fetchLenders({ signal }),
    staleTime: 30_000,
    refetchOnWindowFocus: false
  });

  const {
    data: requirementsData,
    isLoading: requirementsLoading,
    error: requirementsError
  } = useQuery({
    queryKey: ["lender-product-requirements", productId],
    queryFn: () => fetchClientLenderProductRequirements(productId ?? ""),
    enabled: Boolean(productId)
  });

  const deleteMutation = useMutation({
    mutationFn: ({ requirementId }: { requirementId: string }) =>
      deleteLenderProductRequirement(productId ?? "", requirementId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["lender-product-requirements", productId] });
    }
  });

  useEffect(() => {
    if (!requirementsData?.requirements) return;
    setRows(requirementsData.requirements.map(toRow));
  }, [requirementsData]);

  useEffect(() => {
    if (!location.pathname.endsWith("/requirements")) return;
    requirementsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [location.pathname]);

  const lenderName = useMemo(() => {
    if (!product) return "";
    return lenders.find((lender) => lender.id === product.lenderId)?.name ?? "";
  }, [lenders, product]);
  const lenderSubmissionConfig = useMemo(() => {
    if (!product) return null;
    return lenders.find((lender) => lender.id === product.lenderId)?.submissionConfig ?? null;
  }, [lenders, product]);
  const lenderSubmissionMethod = lenderSubmissionConfig?.method ?? "MANUAL";

  const documentTypeOptions = useMemo(() => {
    const source = new Set<string>();
    requirementsData?.documentTypes?.forEach((type) => source.add(type));
    rows.forEach((row) => {
      if (row.documentType.trim()) source.add(row.documentType.trim());
    });
    return Array.from(source.values()).sort();
  }, [requirementsData, rows]);

  const requiredCount = useMemo(() => rows.filter((row) => row.required).length, [rows]);
  const hasEdits = rows.some((row) => row.isEditing);

  const handleAddRequirement = () => {
    const tempId = `new-${
      typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Date.now().toString()
    }`;
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
    if (!productId) return;
    setSaveError(null);
    const validated = rows.map((row) => ({ ...row, error: row.isEditing ? validateRow(row) : row.error }));
    setRows(validated);
    if (validated.some((row) => row.error)) return;
    if (validated.filter((row) => row.required).length === 0) {
      setSaveError("At least one required document must remain required.");
      return;
    }
    const editedRows = validated.filter((row) => row.isEditing);
    if (!editedRows.length) return;
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
        setRows((prev) =>
          prev.map((item) =>
            item.id === row.id
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
              : item
          )
        );
      } catch (error) {
        hasError = true;
        setRows((prev) =>
          prev.map((item) =>
            item.id === row.id
              ? { ...item, error: getErrorMessage(error, "Unable to save requirement.") }
              : item
          )
        );
      }
    }
    setIsSaving(false);
    if (!hasError) {
      queryClient.invalidateQueries({ queryKey: ["lender-product-requirements", productId] });
    }
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate({ requirementId: id });
  };

  if (productLoading || lendersLoading || requirementsLoading) return <AppLoading />;

  if (productError || lendersError || requirementsError) {
    return (
      <ErrorBanner
        message={getErrorMessage(productError ?? lendersError ?? requirementsError, "Unable to load product details.")}
      />
    );
  }

  if (!product) {
    return <ErrorBanner message="Unable to load product details." />;
  }

  return (
    <div className="page page--lender-product-detail">
      <div className="page-header">
        <div>
          <h1>{product.productName}</h1>
          <p className="page-header__subtitle">{lenderName}</p>
        </div>
      </div>

      <div className="page-grid">
        <Card>
          <div className="card__body space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`status-pill status-pill--submission-${getSubmissionMethodBadgeTone(lenderSubmissionMethod)}`}>
                {getSubmissionBadgeLabel(lenderSubmissionMethod)}
              </span>
              <span className="status-pill status-pill--active">Active</span>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <div className="text-xs uppercase text-slate-400">Category</div>
                <div>{LENDER_PRODUCT_CATEGORY_LABELS[product.category] ?? product.category}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-slate-400">Country</div>
                <div>{product.country}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-slate-400">Amount range</div>
                <div>
                  ${product.minAmount.toLocaleString()} - ${product.maxAmount.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase text-slate-400">Rate type</div>
                <div>{product.rateType}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-slate-400">Submission method</div>
                <div>{getSubmissionMethodLabel(lenderSubmissionMethod)}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-slate-400">Submission config</div>
                <div>{getSubmissionConfigSummary(lenderSubmissionConfig ?? undefined)}</div>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="card__body space-y-4" ref={requirementsRef}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2>Required documents</h2>
                <p className="text-sm text-slate-500">
                  {requiredCount} required document{requiredCount === 1 ? "" : "s"}
                </p>
              </div>
              <Button variant="secondary" onClick={handleAddRequirement}>
                Add requirement
              </Button>
            </div>

            {saveError && <ErrorBanner message={saveError} />}

            <Table headers={["Document type", "Required", "Min amount", "Max amount", "Actions"]}>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    {row.isEditing ? (
                      <Input
                        value={row.documentType}
                        onChange={(event) =>
                          setRows((prev) =>
                            prev.map((item) =>
                              item.id === row.id ? { ...item, documentType: event.target.value, error: null } : item
                            )
                          )
                        }
                      />
                    ) : (
                      row.documentType
                    )}
                    {row.error && <div className="text-xs text-red-600">{row.error}</div>}
                  </td>
                  <td>
                    {row.isEditing ? (
                      <Select
                        value={row.required ? "required" : "optional"}
                        onChange={(event) =>
                          setRows((prev) =>
                            prev.map((item) =>
                              item.id === row.id
                                ? { ...item, required: event.target.value === "required", error: null }
                                : item
                            )
                          )
                        }
                      >
                        <option value="required">Required</option>
                        <option value="optional">Optional</option>
                      </Select>
                    ) : row.required ? (
                      "Required"
                    ) : (
                      "Optional"
                    )}
                  </td>
                  <td>
                    {row.isEditing ? (
                      <Input
                        value={row.minAmount}
                        onChange={(event) =>
                          setRows((prev) =>
                            prev.map((item) =>
                              item.id === row.id ? { ...item, minAmount: event.target.value, error: null } : item
                            )
                          )
                        }
                      />
                    ) : (
                      row.minAmount || "—"
                    )}
                  </td>
                  <td>
                    {row.isEditing ? (
                      <Input
                        value={row.maxAmount}
                        onChange={(event) =>
                          setRows((prev) =>
                            prev.map((item) =>
                              item.id === row.id ? { ...item, maxAmount: event.target.value, error: null } : item
                            )
                          )
                        }
                      />
                    ) : (
                      row.maxAmount || "—"
                    )}
                  </td>
                  <td>
                    {row.isEditing ? (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={handleSave}
                          disabled={isSaving}
                        >
                          Save
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setRows((prev) =>
                              prev.map((item) =>
                                item.id === row.id
                                  ? { ...item, isEditing: false, error: null, isNew: false }
                                  : item
                              )
                            )
                          }
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setRows((prev) =>
                              prev.map((item) =>
                                item.id === row.id ? { ...item, isEditing: true, error: null } : item
                              )
                            )
                          }
                        >
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(row.id)}>
                          Delete
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </Table>

            {documentTypeOptions.length ? (
              <div className="text-xs text-slate-500">
                Suggested document types: {documentTypeOptions.join(", ")}
              </div>
            ) : null}

            {hasEdits && (
              <div className="flex items-center gap-2">
                <Button variant="primary" onClick={handleSave} disabled={isSaving}>
                  Save changes
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setRows((prev) => prev.map((row) => ({ ...row, isEditing: false, error: null })))}
                >
                  Cancel edits
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default LenderProductDetail;
