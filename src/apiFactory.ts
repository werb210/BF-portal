import { env } from "@/config/env";
import { http } from "@/lib/api";

const resolveBaseURL = (silo: string) => `${env.API_URL}/${silo.toLowerCase()}`;

export function createApi(silo: string, _token: string) {
  return {
    defaults: {
      baseURL: resolveBaseURL(silo),
    },
    get: <T>(path: string): Promise<T> => http.get<T>(path),
    post: <T>(path: string, body?: unknown): Promise<T> => http.post<T>(path, body),
    patch: <T>(path: string, body?: unknown): Promise<T> => http.patch<T>(path, body),
    put: <T>(path: string, body?: unknown): Promise<T> => http.put<T>(path, body),
    delete: <T>(path: string): Promise<T> => http.delete<T>(path),
  };
}
