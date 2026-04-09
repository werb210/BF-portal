import axios from "axios";

const baseURL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "https://server.boreal.financial";

const api = axios.create({
  baseURL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export async function apiFetch(path: string, options: RequestInit = {}): Promise<any> {
  const response = await api.request({
    url: path,
    method: options.method,
    data: options.body,
    headers: options.headers as Record<string, string> | undefined,
  });

  return response.data;
}

export default api;
