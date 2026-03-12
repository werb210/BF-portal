import axios from "axios";

export const clientApi = axios.create({
  baseURL: "https://api.staff.boreal.financial/api",
  withCredentials: false,
});

clientApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("boreal_staff_token");

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default clientApi;
