export function assertEnv() {
  const required = ["VITE_API_URL"] as const;

  const missing = required.filter((key) => !import.meta.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required env variables: ${missing.join(", ")}`);
  }
}

export const ENV = {
  API_URL: import.meta.env.VITE_API_URL as string,
};
