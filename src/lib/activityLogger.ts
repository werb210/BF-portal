import { logger } from "@/utils/logger";

export function logActivity(event: string, metadata: Record<string, unknown> = {}) {
  logger.info("Portal Activity", { event, metadata });

  // Ready for future server push
  // apiRequest("/activity", { method: "POST", data: { event, metadata } });
}
