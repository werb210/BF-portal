import { env } from "@/config/env";

export function getTestApiUrl() {
  return `${env.API_URL}/api/v1`;
}
