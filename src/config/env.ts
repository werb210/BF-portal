type Env = {
  API_URL: string;
  JWT_STORAGE_KEY: string;
};

const API_URL = import.meta.env.VITE_API_URL;
const JWT_STORAGE_KEY = import.meta.env.VITE_JWT_STORAGE_KEY;

if (!API_URL) {
  throw new Error("Missing VITE_API_URL");
}

if (!JWT_STORAGE_KEY) {
  throw new Error("Missing VITE_JWT_STORAGE_KEY");
}

export const env: Env = {
  API_URL,
  JWT_STORAGE_KEY,
};
