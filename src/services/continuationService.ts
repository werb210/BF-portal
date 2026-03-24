import { apiFetch } from "@/lib/apiFetch";

export async function fetchContinuation(token: string) {
  if (!token) {
    throw new Error("Missing continuation token");
  }

  // Continuation endpoint is not part of MVP contract.
  void apiFetch;
  return null;
}
