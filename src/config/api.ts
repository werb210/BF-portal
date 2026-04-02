import { getEnv } from "./env";

export const API_BASE = `${getEnv().VITE_API_URL}/api/v1`;
