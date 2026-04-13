type Env = {
  VITE_API_URL: string;
  VITE_API_BASE: string;
  VITE_API_BASE_URL: string;
  VITE_JWT_STORAGE_KEY: string;
};

const VITE_API_BASE =
  import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
const VITE_API_BASE_URL = VITE_API_BASE;
const VITE_API_URL = VITE_API_BASE_URL;
const VITE_JWT_STORAGE_KEY = import.meta.env.VITE_JWT_STORAGE_KEY || "auth_token";

if (!VITE_API_BASE) {
  throw new Error("Missing VITE_API_BASE");
}

export const env: Env = {
  VITE_API_URL,
  VITE_API_BASE,
  VITE_API_BASE_URL,
  VITE_JWT_STORAGE_KEY,
};
