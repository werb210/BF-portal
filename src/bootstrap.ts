import { apiRequest } from "@/lib/api";

export async function bootstrap() {
  try {
    await apiRequest("/api/auth/me", { method: "GET" });
  } catch (err: any) {
    if (err?.message === "AUTH_REQUIRED") return;
    throw err;
  }
}
