import { apiFetch } from "../lib/apiFetch"

export async function fetchPipeline() {
  return apiFetch("/api" + "/dashboard/pipeline")
}

export async function fetchApplications() {
  return apiFetch("/api" + "/applications")
}
