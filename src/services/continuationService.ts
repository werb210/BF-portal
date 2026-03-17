import { apiFetch } from "@/lib/apiFetch";

export async function fetchContinuation(token: string) {
  if (!token) {
    throw new Error("Missing continuation token");
  }

  return apiFetch(`/continuation/${token}`, {
    method: "GET",
  });
}
