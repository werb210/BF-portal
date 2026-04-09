import { api } from "@/api";
import { assertSilo } from "./siloGuard";

export async function apiCall<T>(path: string, options?: Parameters<typeof api>[1]) {
  const payload = await api<T>(path, options);
  assertSilo(payload);
  return payload;
}
