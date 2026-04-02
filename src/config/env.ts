function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }

  return value;
}

export function assertEnv() {
  const required = ["VITE_API_URL"] as const;

  const missing = required.filter((key) => !import.meta.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required env variables: ${missing.join(", ")}`);
  }
}

export const ENV = {
  API_URL: requireEnv("VITE_API_URL", import.meta.env.VITE_API_URL),
  JWT_STORAGE_KEY: import.meta.env.VITE_JWT_STORAGE_KEY || "bf_jwt_token",
};
