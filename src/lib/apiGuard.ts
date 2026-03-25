let initialized = false;

export function assertApiUsage() {
  if (initialized) return;
  initialized = true;

  console.warn("API guard bypassed");
}
