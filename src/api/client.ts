import { apiFetch } from "@/lib/api";

export const apiClient = (
  url: string,
  options: RequestInit = {}
) => {
  return apiFetch(url, options);
};

export default apiClient;
export { apiFetch };
