function assertApiUrl(url: string | undefined): string {
  if (!url) throw new Error("MISSING_API_URL");
  if (!url.includes("/api/v1")) throw new Error("INVALID_API_VERSION");
  return url;
}

export const API_BASE_URL = assertApiUrl(import.meta.env.VITE_API_URL);
