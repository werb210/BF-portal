type Env = {
  VITE_API_URL: string;
  VITE_API_BASE_URL: string;
  VITE_JWT_STORAGE_KEY: string;
};

const VITE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
const VITE_API_URL = import.meta.env.VITE_API_URL || VITE_API_BASE_URL;
const VITE_JWT_STORAGE_KEY = import.meta.env.VITE_JWT_STORAGE_KEY || "bf_jwt_token";

export const env: Env = {
  VITE_API_URL,
  VITE_API_BASE_URL,
  VITE_JWT_STORAGE_KEY,
};
