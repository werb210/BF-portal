const viteMode = typeof import.meta !== "undefined" && import.meta.env ? import.meta.env.MODE : undefined;
const viteApiUrl = typeof import.meta !== "undefined" && import.meta.env ? import.meta.env.VITE_API_URL : undefined;

function assertApiUrl(url: string | undefined): string {
  if (!url) throw new Error("MISSING_API_URL");
  if (!url.includes("/api/v1")) throw new Error("INVALID_API_VERSION");
  return url;
}

export const API_BASE_URL =
  viteMode === "test"
    ? "http://localhost/api/v1"
    : assertApiUrl(viteApiUrl);
