/* ============================================================
   FILE: src/utils/api.ts
   PURPOSE: Centralized API utilities + health check export
   ============================================================ */

import { apiClient } from "@/api/httpClient";
import { API_BASE_URL } from "@/config/api";

export { API_BASE_URL };

/* ============================================================
   REQUIRED LEGACY EXPORT — DO NOT REMOVE
   Used by src/App.tsx
   ============================================================ */
export async function checkStaffServerHealth(): Promise<boolean> {
  const result = await apiClient.get("/health", { skipAuth: true });
  return result.success;
}
