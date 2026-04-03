import { apiCall } from "@/lib/api";

export async function waitForReady(retries = 10, delay = 500) {
  for (let i = 0; i < retries; i++) {
    try {
      await apiCall("/ready");
      return;
    } catch {
      // retry
    }

    await new Promise((r) => setTimeout(r, delay));
  }

  throw new Error("API_NOT_READY");
}
