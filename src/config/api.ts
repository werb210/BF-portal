const PRODUCTION_API_URL = "https://api.staff.boreal.financial";

const runtimeApiUrl =
  (typeof window !== "undefined" && (window as any).__ENV__?.VITE_API_URL) ||
  import.meta.env.VITE_API_URL;

export const API_BASE_URL = (runtimeApiUrl || PRODUCTION_API_URL).replace(/\/$/, "");
