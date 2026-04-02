import { env } from "@/config/env";

export function getTestApiUrl() {
  return `${env.VITE_API_URL}/api/v1`;
}
