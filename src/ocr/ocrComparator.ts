import { OCR_FIELD_REGISTRY, OCR_FIELD_REGISTRY_MAP, type OcrFieldDefinition } from "./OCR_FIELD_REGISTRY";
import type { OcrResultRecord } from "@/ocr/ocrTypes";

export type OcrMismatchFlag = {
  field_key: string;
  document_id: string;
  value: string;
  comparison_values: string[];
};

export type OcrComparisonResult = {
  mismatch_flags: OcrMismatchFlag[];
  missing_required_fields: string[];
};

const normalizeString = (value: string) => value.trim().toUpperCase();

const normalizeNumeric = (value: string) => {
  const numeric = Number(value.replace(/[^\d.-]/g, ""));
  return Number.isNaN(numeric) ? null : numeric;
};

const normalizeDate = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!match) return null;
  const [, rawMonth = "", rawDay = "", rawYear = ""] = match;
  const month = rawMonth.padStart(2, "0");
  const day = rawDay.padStart(2, "0");
  const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
  return `${year}-${month}-${day}`;
};

const normalizeValue = (field: OcrFieldDefinition, value: string) => {
  switch (field.type) {
    case "numeric":
      return normalizeNumeric(value);
    case "date":
      return normalizeDate(value);
    default:
      return normalizeString(value);
  }
};

const valuesMatch = (field: OcrFieldDefinition, left: string, right: string) => {
  const leftValue = normalizeValue(field, left);
  const rightValue = normalizeValue(field, right);
  if (leftValue == null || rightValue == null) return false;
  if (field.type === "numeric" && typeof leftValue === "number" && typeof rightValue === "number") {
    return Math.abs(leftValue - rightValue) <= field.tolerance;
  }
  return leftValue === rightValue;
};

export const compareOcrResults = (results: OcrResultRecord[]): OcrComparisonResult => {
  const filteredResults = results.filter((result) => OCR_FIELD_REGISTRY_MAP.has(result.field_key));
  const resultsByField = filteredResults.reduce<Record<string, OcrResultRecord[]>>((acc, result) => {
    if (!acc[result.field_key]) acc[result.field_key] = [];
    const bucket = acc[result.field_key];
    if (!bucket) return acc;
    bucket.push(result);
    return acc;
  }, {});

  const missing_required_fields = OCR_FIELD_REGISTRY
    .filter((field) => !(resultsByField[field.field_key]?.length))
    .map((field) => field.field_key);

  const mismatch_flags: OcrMismatchFlag[] = [];

  Object.entries(resultsByField).forEach(([fieldKey, fieldResults]) => {
    if (fieldResults.length < 2) return;
    const field = OCR_FIELD_REGISTRY_MAP.get(fieldKey);
    if (!field) return;
    const uniqueValues = Array.from(new Set(fieldResults.map((item) => item.extracted_value)));
    const hasMismatch = uniqueValues.some((value, index) =>
      uniqueValues.slice(index + 1).some((other) => !valuesMatch(field, value, other))
    );
    if (!hasMismatch) return;

    fieldResults.forEach((entry) => {
      const comparison_values = fieldResults
        .filter((other) => other.document_id !== entry.document_id)
        .map((other) => other.extracted_value);
      mismatch_flags.push({
        field_key: fieldKey,
        document_id: entry.document_id,
        value: entry.extracted_value,
        comparison_values
      });
    });
  });

  return { mismatch_flags, missing_required_fields };
};
