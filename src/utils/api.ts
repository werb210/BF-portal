/* ============================================================
   FILE: src/utils/api.ts
   PURPOSE: Centralized API utilities + health check export
   ============================================================ */

import { apiClient } from "@/api/httpClient";
import { API_BASE } from "@/config/api";
import { API_ROUTES } from "@/contracts/api";

export { API_BASE };

/* ============================================================
   REQUIRED LEGACY EXPORT — DO NOT REMOVE
   Used by src/App.tsx
   ============================================================ */
export async function checkStaffServerHealth(): Promise<boolean> {
  const result = await apiClient.get(API_ROUTES.health, { skipAuth: true });
  return result.success;
}
