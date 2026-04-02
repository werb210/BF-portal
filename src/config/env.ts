function req(name: string, value: string | undefined) {
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

export const ENV = {
  API_URL: req("VITE_API_URL", import.meta.env.VITE_API_URL),
  JWT_STORAGE_KEY:
    import.meta.env.VITE_JWT_STORAGE_KEY || "bf_jwt_token",
};

export function assertEnv() {
  req("VITE_API_URL", import.meta.env.VITE_API_URL);
}
