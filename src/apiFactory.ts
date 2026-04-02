import { http } from "@/api/httpClient";

const resolveBaseURL = (silo: string) => `${import.meta.env.VITE_API_URL}/${silo.toLowerCase()}`;

export function createApi(silo: string, _token: string) {
  return {
    defaults: {
      baseURL: resolveBaseURL(silo),
    },
    get: async <T>(path: string): Promise<T> => {
      const res = await http.get<T>(path);
      if (!res.success) {
        throw new Error("error" in res ? res.error : "Request failed");
      }
      return res.data;
    },
    post: async <T>(path: string, body?: unknown): Promise<T> => {
      const res = await http.post<T>(path, body);
      if (!res.success) {
        throw new Error("error" in res ? res.error : "Request failed");
      }
      return res.data;
    },
  };
}
