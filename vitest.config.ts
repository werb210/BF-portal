import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    exclude: ["node_modules", "dist", "**/node_modules/**", "tests/**"],
    environment: "jsdom",
    setupFiles: ["./src/__tests__/setup.ts", "./src/setupTests.ts"],
    globals: true,
  },
});
