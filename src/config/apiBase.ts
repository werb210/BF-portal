import { API_BASE_URL, normalizeApiBaseUrl } from "@/config/api";

declare global {
  interface Window {
    __ENV?: {
      API_BASE?: string;
    };
  }
}

function readRuntimeApiBase(): string {
  return (
    import.meta.env.VITE_API_BASE ||
    window?.__ENV?.API_BASE ||
    API_BASE_URL
  );
}

export function getApiBase(): string {
  return normalizeApiBaseUrl(readRuntimeApiBase());
}

export const API_BASE = getApiBase();
