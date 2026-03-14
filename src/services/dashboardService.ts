import { apiFetch } from "../lib/apiClient";

export async function loadDashboard() {
  return apiFetch("/api/dashboard/metrics");
}

export async function loadPipeline() {
  return apiFetch("/api/dashboard/pipeline");
}

export async function loadOffers() {
  return apiFetch("/api/dashboard/offers");
}
