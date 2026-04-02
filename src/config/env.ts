type Env = {
  API_URL: string;
  JWT_STORAGE_KEY: string;
};

const required = ["VITE_API_URL", "VITE_JWT_STORAGE_KEY"] as const;

function getEnv(): Env {
  for (const key of required) {
    if (!import.meta.env[key]) {
      throw new Error(`Missing env variable: ${key}`);
    }
  }

  return {
    API_URL: import.meta.env.VITE_API_URL,
    JWT_STORAGE_KEY: import.meta.env.VITE_JWT_STORAGE_KEY,
  };
}

export const env = getEnv();
