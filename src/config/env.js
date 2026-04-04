const VITE_API_URL = import.meta.env.VITE_API_URL;
const VITE_JWT_STORAGE_KEY = import.meta.env.VITE_JWT_STORAGE_KEY || "bf_jwt_token";
const required = ["TWILIO_ACCOUNT_SID"];
if (process.env.NODE_ENV !== "test") {
    for (const key of required) {
        if (!process.env[key]) {
            throw new Error(`Missing required env var: ${key}`);
        }
    }
}
export const env = {
    VITE_API_URL,
    VITE_JWT_STORAGE_KEY,
};
