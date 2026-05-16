import type { Silo } from "@/core/silo";

// BF_PORTAL_BLOCK_BI_PIPELINE_STAGE_IDS_v1
// PipelinePage filters data.stages by stageSet.has(normalizeStageId(s.id)),
// so this list must hold stage IDs that match BI_STAGES.id in
// src/silos/bi/pipeline/biStages.ts -- not display labels. The previous
// label list ("New Policy Request", "Underwriting", ...) only overlapped
// on quoted/bound/declined after normalization, dropping 5 columns from
// the BI pipeline view.
export const pipelineStages: Record<Silo, string[]> = {
  BF: ["RECEIVED", "IN_REVIEW", "DOCUMENTS_REQUIRED", "STARTUP", "OFF_TO_LENDER", "OFFER", "ACCEPTED", "REJECTED"],
  BI: ["new_application", "documents_pending", "under_review", "docs_rejected", "sent_to_pgi", "quoted", "bound", "declined"],
  SLF: ["Imported", "Scoring", "Manual Review", "Funded", "Declined"]
};
