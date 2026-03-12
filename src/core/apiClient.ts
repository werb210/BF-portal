import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  withCredentials: true
});

const token = localStorage.getItem("bf_token");

if (token) {
  api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("bf_token");

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("bf_token");
      delete api.defaults.headers.common["Authorization"];
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default api;
