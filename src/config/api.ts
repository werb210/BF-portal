const processEnvBaseUrl =
  typeof process !== "undefined" && process.env
    ? process.env.API_BASE_URL
    : undefined;

const viteMode =
  typeof import.meta !== "undefined" && import.meta.env
    ? import.meta.env.MODE
    : undefined;

const viteEnvBaseUrl =
  typeof import.meta !== "undefined" && import.meta.env
    ? import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL
    : undefined;

if (viteMode === "test" && import.meta.env.VITE_API_URL) {
  throw new Error("VITE_API_URL must be empty in test mode");
}

export const API_BASE_URL =
  processEnvBaseUrl || viteEnvBaseUrl || "https://boreal-staff-server.azurewebsites.net";
