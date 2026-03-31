import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

export async function apiRequest(
  path: string,
  options: { method?: "GET"|"POST"|"PUT"|"DELETE"; body?: any } = {}
) {
  try {
    const res = await api.request({
      url: path,
      method: options.method || "GET",
      data: options.body,
    });

    return {
      ok: true,
      status: res.status,
      data: res.data,
    };
  } catch (err: any) {
    // mimic fetch behavior instead of throwing
    if (err.response) {
      return {
        ok: false,
        status: err.response.status,
        data: err.response.data,
      };
    }

    return {
      ok: false,
      status: 0,
      data: null,
    };
  }
}

// backward-compat for tests
export const apiFetch = apiRequest;
export const apiClient = api;

export default api;
