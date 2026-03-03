import type { Silo } from "@/core/silo";

export const pipelineStages: Record<Silo, string[]> = {
  BF: ["New", "In Review", "Requires Docs", "Sent to Lender", "Approved", "Declined"],
  BI: ["New Policy Request", "Underwriting", "Quoted", "Bound", "Declined"],
  SLF: ["Imported", "Scoring", "Manual Review", "Funded", "Declined"]
};
