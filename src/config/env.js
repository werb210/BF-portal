const VITE_API_URL = import.meta.env.VITE_API_URL;
const VITE_JWT_STORAGE_KEY = import.meta.env.VITE_JWT_STORAGE_KEY || "bf_jwt_token";
export const env = {
    VITE_API_URL,
    VITE_JWT_STORAGE_KEY,
};
