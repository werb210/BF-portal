export const API_BASE =
  import.meta.env.VITE_API_BASE ??
  (import.meta.env.PROD
    ? "https://api.boreal.financial"
    : "http://localhost:3000");

export function withApiBase(path: string) {
  if (path.startsWith("http")) return path;
  return `${API_BASE}${path}`;
}
