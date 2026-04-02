import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  },
  test: {
    setupFiles: ["./src/__tests__/setup.ts"],
    environment: "jsdom",
    env: {
      VITE_API_URL: "http://test.local/api/v1"
    },
    globals: true,
    isolate: true,
    unstubGlobals: true,
    include: ["src/__tests__/**/*.test.ts"]
  }
});
