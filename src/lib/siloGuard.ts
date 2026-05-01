import { getActiveSilo } from "@/config/api";

export function assertSilo(data: unknown): void {
  const silo = getActiveSilo();

  if (!data) return;

  if (Array.isArray(data)) {
    data.forEach(assertSilo);
    return;
  }

  if (typeof data !== "object") return;

  const record = data as { silo?: unknown };
  if (typeof record.silo === "string" && record.silo !== silo) {
    throw new Error("🚨 CROSS-SILO DATA BLOCKED");
  }
}
