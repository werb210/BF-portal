import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchDocumentRequirements } from "@/api/documents";
import { fetchOcrInsights } from "@/api/ocr.routes";
import { OCR_FIELD_REGISTRY, getOcrFieldDefinition } from "@/ocr/OCR_FIELD_REGISTRY";
import { useApplicationDrawerStore } from "@/state/applicationDrawer.store";
import type { DocumentRequirement } from "@/types/documents.types";
import type { OcrMismatchFlag } from "@/ocr/ocrComparator";
import { resolveOcrInsightsCategoryId } from "@/features/ocrInsights/ocrInsightsConfig";

export type OcrInsightRow = {
  fieldKey: string;
  label: string;
  value: string;
  documentId: string;
  documentName: string;
  documentCategory: string;
  confidence?: number;
  conflict: boolean;
  comparisonValues: string[];
};

export type OcrInsightsView = {
  groupedByDocument: Record<string, Record<string, OcrInsightRow[]>>;
  requiredFields: OcrRequiredFieldStatus[];
  conflictGroups: OcrConflictGroup[];
  totalRows: number;
};

export type OcrMismatchRow = {
  fieldKey: string;
  label: string;
  value: string;
  documentId: string;
  documentName: string;
  comparisonValues: string[];
};

export type OcrRequiredFieldStatus = {
  fieldKey: string;
  label: string;
  present: boolean;
};

export type OcrConflictGroup = {
  fieldKey: string;
  label: string;
  values: Array<{
    documentId: string;
    documentName: string;
    value: string;
  }>;
};

const buildMismatchLookup = (mismatches: OcrMismatchFlag[]) => {
  const lookup = new Map<string, OcrMismatchFlag>();
  mismatches.forEach((mismatch) => {
    lookup.set(`${mismatch.field_key}:${mismatch.document_id}`, mismatch);
  });
  return lookup;
};

const resolveDocumentMeta = (documentId: string, documents: DocumentRequirement[]) => {
  const fallback = { name: "Unknown document", category: "Uncategorized" };
  const doc = documents.find((item) => item.id === documentId);
  if (!doc) return fallback;
  return {
    name: doc.name,
    category: doc.category ?? "Uncategorized"
  };
};

export const useOCRInsights = () => {
  const applicationId = useApplicationDrawerStore((state) => state.selectedApplicationId);

  const ocrQuery = useQuery({
    queryKey: ["ocr", applicationId, "insights"],
    queryFn: () => fetchOcrInsights(applicationId ?? ""),
    enabled: Boolean(applicationId)
  });

  const documentsQuery = useQuery({
    queryKey: ["applications", applicationId, "documents"],
    queryFn: ({ signal }) => fetchDocumentRequirements(applicationId ?? "", { signal }),
    enabled: Boolean(applicationId)
  });

  const view = useMemo<OcrInsightsView>(() => {
    const documents = documentsQuery.data ?? [];
    const ocrData = ocrQuery.data;
    if (!ocrData) {
      return { groupedByDocument: {}, requiredFields: [], conflictGroups: [], totalRows: 0 };
    }

    const mismatchLookup = buildMismatchLookup(ocrData.mismatch_flags);
    const groupedByDocument: Record<string, Record<string, OcrInsightRow[]>> = {};

    ocrData.results.forEach((result) => {
      const field = getOcrFieldDefinition(result.field_key);
      const documentMeta = resolveDocumentMeta(result.document_id, documents);
      const mismatch = mismatchLookup.get(`${result.field_key}:${result.document_id}`);
      const categoryId = resolveOcrInsightsCategoryId(result.field_key);
      const row: OcrInsightRow = {
        fieldKey: result.field_key,
        label: field?.display_label ?? result.field_key,
        value: result.extracted_value,
        documentId: result.document_id,
        documentName: documentMeta.name,
        documentCategory: categoryId,
        confidence: result.confidence,
        conflict: Boolean(mismatch),
        comparisonValues: mismatch?.comparison_values ?? []
      };
      const documentType = documentMeta.category;
      if (!groupedByDocument[documentType]) groupedByDocument[documentType] = {};
      if (!groupedByDocument[documentType][categoryId]) groupedByDocument[documentType][categoryId] = [];
      groupedByDocument[documentType][categoryId].push(row);
    });

    const conflictGroups = new Map<string, OcrConflictGroup>();
    ocrData.mismatch_flags.forEach((flag) => {
      const field = getOcrFieldDefinition(flag.field_key);
      const documentMeta = resolveDocumentMeta(flag.document_id, documents);
      if (!conflictGroups.has(flag.field_key)) {
        conflictGroups.set(flag.field_key, {
          fieldKey: flag.field_key,
          label: field?.display_label ?? flag.field_key,
          values: []
        });
      }
      conflictGroups.get(flag.field_key)?.values.push({
        documentId: flag.document_id,
        documentName: documentMeta.name,
        value: flag.value
      });
    });

    return {
      groupedByDocument,
      requiredFields: OCR_FIELD_REGISTRY.map((field) => ({
        fieldKey: field.field_key,
        label: field.display_label,
        present: ocrData.results.some((result) => result.field_key === field.field_key)
      })),
      conflictGroups: Array.from(conflictGroups.values()),
      totalRows: ocrData.results.length
    };
  }, [documentsQuery.data, ocrQuery.data]);

  return {
    applicationId,
    isLoading: ocrQuery.isLoading || documentsQuery.isLoading,
    error: ocrQuery.error ?? documentsQuery.error,
    data: view
  };
};
