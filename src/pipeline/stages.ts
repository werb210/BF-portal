import type { Silo } from "@/core/silo";

export const pipelineStages: Record<Silo, string[]> = {
  BF: ["RECEIVED", "IN_REVIEW", "DOCUMENTS_REQUIRED", "STARTUP", "OFF_TO_LENDER", "OFFER", "ACCEPTED", "REJECTED"],
  BI: ["New Policy Request", "Underwriting", "Quoted", "Bound", "Declined"],
  SLF: ["Imported", "Scoring", "Manual Review", "Funded", "Declined"]
};
