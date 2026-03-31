const processEnvBaseUrl =
  typeof process !== "undefined" && process.env
    ? process.env.API_BASE_URL
    : undefined;

const viteEnvBaseUrl =
  typeof import.meta !== "undefined" && import.meta.env
    ? import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL
    : undefined;

export const API_BASE_URL =
  processEnvBaseUrl || viteEnvBaseUrl || "https://boreal-staff-server.azurewebsites.net";
