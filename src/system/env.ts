export function validateEnv() {
  const url = import.meta.env.VITE_API_URL;

  if (!url) {
    throw new Error("VITE_API_URL is not defined");
  }
}
