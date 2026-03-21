import { logger } from "@/utils/logger";

export function logActivity(event: string, metadata: Record<string, unknown> = {}) {
  logger.info("Portal Activity", { event, metadata });

  // Ready for future server push
  // fetch(buildUrl("/api" + "/activity"), { method: "POST", body: JSON.stringify({ event, metadata }) });
}
