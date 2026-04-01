const isProd = import.meta.env.MODE === "production";

export function guardConsole() {
  if (!isProd) return;

  const originalError = console.error;

  console.error = function (...args: unknown[]) {
    originalError.apply(console, args);
  };
}
