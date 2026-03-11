import { API_BASE_URL } from "@/config/api";

const required = [
  "VITE_JWT_STORAGE_KEY"
] as const;

type RequiredEnv = (typeof required)[number];

function getEnv(key: RequiredEnv): string {
  const value = import.meta.env[key];

  if (!value) {
    console.warn(`[ENV WARNING] Missing ${key}. Using safe fallback.`);
  }

  return value || "";
}

const isTestEnv =
  process.env.NODE_ENV === "test" ||
  process.env.VITEST === "true" ||
  import.meta.env.MODE === "test";

export const ENV = {
  API_BASE_URL: isTestEnv ? "http://localhost" : API_BASE_URL,

  JWT_STORAGE_KEY:
    getEnv("VITE_JWT_STORAGE_KEY") || "boreal_staff_token"
};
