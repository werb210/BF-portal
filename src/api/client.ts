import axios from "axios";

const api = axios.create({
  baseURL: "https://server.boreal.financial/api",
  timeout: 20000,
  withCredentials: true
});

api.interceptors.request.use((config) => {

  const token = localStorage.getItem("auth_token");

  if (token) {
    config.headers = {
      ...(config.headers as Record<string, string> | undefined),
      Authorization: `Bearer ${token}`
    } as any;
  }

  return config;

});

export const clientApi = api;
export default api;
