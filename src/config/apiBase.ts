import { API_BASE_URL, normalizeApiBaseUrl } from "@/config/api";

declare global {
  interface Window {
    __ENV?: {
      API_BASE?: string;
      API_BASE_URL?: string;
      VITE_API_BASE_URL?: string;
      VITE_API_URL?: string;
    };
  }
}

const CANONICAL_PROD_API_BASE = "https://server.boreal.financial/api";

function readRuntimeApiBase(): string {
  const runtimeBase = (
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_BASE ||
    import.meta.env.VITE_API_URL ||
    window?.__ENV?.VITE_API_BASE_URL ||
    window?.__ENV?.API_BASE_URL ||
    window?.__ENV?.API_BASE ||
    window?.__ENV?.VITE_API_URL ||
    API_BASE_URL
  );

  if (typeof window !== "undefined" && /(^|\.)boreal\.financial$/i.test(window.location.hostname)) {
    return CANONICAL_PROD_API_BASE;
  }

  return runtimeBase;
}

export function getApiBase(): string {
  return normalizeApiBaseUrl(readRuntimeApiBase());
}

export const API_BASE = getApiBase();
