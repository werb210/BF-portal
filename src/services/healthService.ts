import { safeFetch } from "@/utils/devApiGuard";

export async function checkServerHealth() {
  return safeFetch("/health");
}
