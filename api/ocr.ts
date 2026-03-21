import { apiClient, type RequestOptions } from "./httpClient";

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

export const fetchOcrResults = (applicationId: string, options?: RequestOptions) =>
  apiClient.get<OcrResults>(`/ocr/${applicationId}/results`, options);
