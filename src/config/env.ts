export const API_BASE = "/api";

if (!API_BASE) {
  throw new Error("[CONFIG ERROR]");
}

export const ENV = {
  API_BASE,
  JWT_STORAGE_KEY: "token",
};
