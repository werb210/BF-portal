import { applicationNeedsDocs } from "./documentStatus"
import type { Document } from "./documentStatus"

type PipelineApplication = {
  documents?: Document[];
  lenderSent?: boolean;
  approved?: boolean;
  declined?: boolean;
};

export function resolveStage(application: PipelineApplication) {
  if (applicationNeedsDocs(application.documents ?? [])) {
    return "REQUIRES_DOCS"
  }

  if (!application.lenderSent) {
    return "IN_REVIEW"
  }

  if (application.approved) {
    return "ACCEPTED"
  }

  if (application.declined) {
    return "DECLINED"
  }

  return "IN_REVIEW"
}
