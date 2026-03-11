export function validateEnv() {
  if (import.meta.env.MODE !== "production") return;
}
