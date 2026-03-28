import type { OcrExtractionInput, OcrExtractionOutput } from "@/ocr/ocrExtractor";
import { runOcrExtraction } from "@/ocr/ocrExtractor";
import type { OcrComparisonResult } from "@/ocr/ocrComparator";
import type { OcrResultRecord } from "@/db/schema/ocrResults";
import { apiClient } from "@/api/httpClient";

export type OcrInsightsResponse = OcrComparisonResult & {
  application_id: string;
  results: OcrResultRecord[];
};

export const extractDocumentOcr = (input: OcrExtractionInput): OcrExtractionOutput => runOcrExtraction(input);

export const fetchOcrInsights = async (applicationId: string): Promise<OcrInsightsResponse> =>
  apiClient.get<OcrInsightsResponse>(`/applications/${applicationId}/ocr-insights`);
