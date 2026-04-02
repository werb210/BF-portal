import { http } from "@/api/httpClient";

const resolveBaseURL = (silo: string) => `${import.meta.env.VITE_API_URL}/${silo.toLowerCase()}`;

export type ApiResponse<T> = {
  success: boolean;
  data: T | null;
  error: string | null;
};

export async function handleApi<T>(promise: Promise<T>): Promise<ApiResponse<T>> {
  try {
    const result = (await promise) as T;

    return {
      success: true,
      data: result,
      error: null,
    };
  } catch (err: unknown) {
    return {
      success: false,
      data: null,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export function createApi(silo: string, _token: string) {
  return {
    defaults: {
      baseURL: resolveBaseURL(silo),
    },
    get: async <T>(path: string): Promise<ApiResponse<T>> => handleApi(http.get<T>(path)),
    post: async <T>(path: string, body?: unknown): Promise<ApiResponse<T>> => handleApi(http.post<T>(path, body)),
    patch: async <T>(path: string, body?: unknown): Promise<ApiResponse<T>> => handleApi(http.patch<T>(path, body)),
    put: async <T>(path: string, body?: unknown): Promise<ApiResponse<T>> => handleApi(http.put<T>(path, body)),
    delete: async <T>(path: string): Promise<ApiResponse<T>> => handleApi(http.delete<T>(path)),
  };
}
