import { OCR_FIELD_REGISTRY, OCR_FIELD_REGISTRY_MAP, type OcrFieldDefinition } from "./OCR_FIELD_REGISTRY";
import type { OcrResultRecord, OcrRunRecord, OcrExtractionTrigger } from "@/ocr/ocrTypes";

export type OcrExtractionInput = {
  applicationId: string;
  documentId: string;
  documentType: string;
  pages: string[];
  trigger: OcrExtractionTrigger;
  extractedAt?: string;
};

export type OcrExtractionOutput = {
  run: OcrRunRecord;
  results: OcrResultRecord[];
};

const ocrRuns: OcrRunRecord[] = [];
const ocrResults: OcrResultRecord[] = [];
const ocrVersionTracker = new Map<string, number>();

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildLabelPattern = (label: string, type: OcrFieldDefinition["type"]) => {
  const escapedLabel = escapeRegExp(label);
  switch (type) {
    case "numeric":
      return new RegExp(`${escapedLabel}\\s*[:\\-]\\s*([\\d,.$-]+)`, "i");
    case "date":
      return new RegExp(`${escapedLabel}\\s*[:\\-]\\s*(\\d{4}-\\d{2}-\\d{2}|\\d{1,2}/\\d{1,2}/\\d{2,4})`, "i");
    default:
      return new RegExp(`${escapedLabel}\\s*[:\\-]\\s*([^\\n]+)`, "i");
  }
};

const resolveRunId = ({
  applicationId,
  documentId,
  version,
  extractedAt
}: {
  applicationId: string;
  documentId: string;
  version: number;
  extractedAt: string;
}) =>
  `${applicationId}-${documentId}-v${version}-${extractedAt.replace(/[:.]/g, "")}`;

const getVersionKey = (applicationId: string, documentId: string) => `${applicationId}:${documentId}`;

const nextVersion = (applicationId: string, documentId: string) => {
  const key = getVersionKey(applicationId, documentId);
  const next = (ocrVersionTracker.get(key) ?? 0) + 1;
  ocrVersionTracker.set(key, next);
  return next;
};

const isFieldApplicable = (field: OcrFieldDefinition, documentType: string) =>
  field.document_types.includes("ALL") || field.document_types.includes(documentType);

const extractFieldFromPages = (field: OcrFieldDefinition, pages: string[]) => {
  const pattern = buildLabelPattern(field.display_label, field.type);
  for (let index = 0; index < pages.length; index += 1) {
    const page = pages[index];
    if (!page) continue;
    const match = page.match(pattern);
    if (match?.[1]) {
      return { value: match[1].trim(), page: index + 1 };
    }
  }
  return null;
};

const calculateConfidence = (value: string) => {
  if (!value) return 0;
  const lengthScore = Math.min(value.length / 30, 1);
  return Number((0.6 + lengthScore * 0.4).toFixed(2));
};

export const runOcrExtraction = ({
  applicationId,
  documentId,
  documentType,
  pages,
  trigger,
  extractedAt
}: OcrExtractionInput): OcrExtractionOutput => {
  const extracted_at = extractedAt ?? new Date().toISOString();
  const version = nextVersion(applicationId, documentId);
  const run_id = resolveRunId({ applicationId, documentId, version, extractedAt: extracted_at });

  const results: OcrResultRecord[] = OCR_FIELD_REGISTRY.reduce<OcrResultRecord[]>((acc, field) => {
    if (!isFieldApplicable(field, documentType)) return acc;
    const extracted = extractFieldFromPages(field, pages);
    if (!extracted) return acc;
    acc.push({
      application_id: applicationId,
      document_id: documentId,
      field_key: field.field_key,
      extracted_value: extracted.value,
      confidence: calculateConfidence(extracted.value),
      source_page: extracted.page,
      extracted_at,
      run_id,
      version
    });
    return acc;
  }, []);

  const run: OcrRunRecord = {
    run_id,
    application_id: applicationId,
    document_id: documentId,
    version,
    extracted_at,
    trigger
  };

  ocrRuns.push(run);
  ocrResults.push(...results);

  return { run, results };
};

export const getOcrResultsForApplication = (applicationId: string) =>
  ocrResults.filter((result) => result.application_id === applicationId);

export const getOcrResultsForDocument = (documentId: string) =>
  ocrResults.filter((result) => result.document_id === documentId);

export const getOcrRunsForDocument = (documentId: string) =>
  ocrRuns.filter((run) => run.document_id === documentId);

export const clearOcrStores = () => {
  ocrRuns.length = 0;
  ocrResults.length = 0;
  ocrVersionTracker.clear();
};

export const getRegisteredFieldLabel = (fieldKey: string) =>
  OCR_FIELD_REGISTRY_MAP.get(fieldKey)?.display_label ?? fieldKey;
