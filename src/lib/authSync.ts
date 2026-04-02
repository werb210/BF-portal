import { env } from "@/config/env";
import { clearToken } from "./authToken";

window.addEventListener("storage", (e) => {
  if (e.key === env.VITE_JWT_STORAGE_KEY && !e.newValue) {
    clearToken();
    window.location.href = "/login";
  }
});
