import { getActiveBusinessUnit } from "@/context/BusinessUnitContext";

const DEFAULT_API_BASE = "https://server.boreal.financial";

const SILO_URLS: Record<string, string> = {
  BF: import.meta.env.VITE_BF_API_URL || import.meta.env.VITE_API_URL || DEFAULT_API_BASE,
  BI: import.meta.env.VITE_BI_API_URL || "https://bi-server.boreal.financial",
  SLF: import.meta.env.VITE_SLF_API_URL || "https://slf-server.boreal.financial",
};

export function getApiBase(): string {
  const silo = getActiveBusinessUnit() ?? "BF";
  return SILO_URLS[silo] ?? SILO_URLS.BF ?? DEFAULT_API_BASE;
}

export const API_BASE = SILO_URLS.BF ?? DEFAULT_API_BASE;

export const buildApiUrl = (path: string): string => {
  if (!path.startsWith("/")) {
    throw new Error(`Invalid API path: "${path}" — must start with /`);
  }
  return `${getApiBase()}${path}`;
};
