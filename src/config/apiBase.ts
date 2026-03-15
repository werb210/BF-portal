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

function readRuntimeApiBase(): string {
  return (
    import.meta.env.VITE_API_BASE ||
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    window?.__ENV?.API_BASE ||
    window?.__ENV?.API_BASE_URL ||
    window?.__ENV?.VITE_API_BASE_URL ||
    window?.__ENV?.VITE_API_URL ||
    API_BASE_URL
  );
}

export function getApiBase(): string {
  return normalizeApiBaseUrl(readRuntimeApiBase());
}

export const API_BASE = getApiBase();
