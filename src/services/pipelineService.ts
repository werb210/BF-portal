import { apiFetch } from "../lib/apiFetch"

export async function fetchPipeline() {
  // Dashboard APIs are not in MVP contract.
  return []
}

export async function fetchApplications() {
  return apiFetch("/api/applications")
}
