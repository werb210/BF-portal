import { clearToken } from "./authStore";

window.addEventListener("storage", (e) => {
  if (e.key === import.meta.env.VITE_JWT_STORAGE_KEY && !e.newValue) {
    clearToken();
    window.location.href = "/login";
  }
});
