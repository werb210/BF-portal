export type OcrExtractionTrigger = string;

export type OcrResultRecord = {
  application_id: string;
  document_id: string;
  field_key: string;
  extracted_value: string;
  confidence: number;
  source_page: number;
  extracted_at: string;
  run_id: string;
  version: number;
};

export type OcrRunRecord = {
  run_id: string;
  application_id: string;
  document_id: string;
  version: number;
  extracted_at: string;
  trigger: OcrExtractionTrigger;
};
