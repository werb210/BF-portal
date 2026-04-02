if (!import.meta.env.VITE_API_URL) {
  Object.defineProperty(import.meta.env, "VITE_API_URL", {
    value: "http://localhost:3000",
    configurable: true,
  });
}
