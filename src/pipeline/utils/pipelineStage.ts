import { applicationNeedsDocs } from "./documentStatus"

export function resolveStage(application: any) {

  if (applicationNeedsDocs(application.documents)) {
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
