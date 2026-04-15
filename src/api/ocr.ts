import { api, type RequestOptions } from "@/api";

// Types for display only — shape matches server response from GET /applications/:id/ocr-insights
export type OcrConflict = { field: string; values: string[] };
export type OcrSection = {
  title: string;
  fields: Record<string, string | number>;
  conflicts?: OcrConflict[];
};
export type OcrResults = {
  balanceSheet?: OcrSection;
  incomeStatement?: OcrSection;
  cashFlow?: OcrSection;
  taxItems?: OcrSection;
  contracts?: OcrSection;
  invoices?: OcrSection;
  required?: OcrSection;
};

export type OcrInsightsResponse = {
  application_id: string;
  mismatch_flags: Array<{
    field_key: string;
    document_id: string;
    value: string;
    comparison_values: string[];
  }>;
  missing_required_fields: string[];
  results: Array<{
    application_id: string;
    document_id: string;
    field_key: string;
    extracted_value: string;
    confidence: number;
    source_page: number;
    extracted_at: string;
    run_id: string;
    version: number;
  }>;
};

/** Fetch OCR results for an application from the server. */
export const fetchOcrResults = (applicationId: string, options?: RequestOptions) =>
  api.get<OcrResults>(`/ocr/${applicationId}/results`, options);

/** Fetch OCR cross-document insights (mismatches, missing fields) from the server. */
export const fetchOcrInsights = (applicationId: string, options?: RequestOptions) =>
  api.get<OcrInsightsResponse>(`/applications/${applicationId}/ocr-insights`, options);
