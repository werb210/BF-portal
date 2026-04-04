import { runOcrExtraction } from "@/ocr/ocrExtractor";
import { api } from "@/api";
export const extractDocumentOcr = (input) => runOcrExtraction(input);
export const fetchOcrInsights = async (applicationId) => api.get(`/applications/${applicationId}/ocr-insights`);
