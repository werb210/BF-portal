import { getEnv } from "@/config/env";

export function getTestApiUrl() {
  return `${getEnv().VITE_API_URL}/api/v1`;
}
