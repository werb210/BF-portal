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
    globals: true,
    isolate: true,
    unstubGlobals: true,
    include: ["src/__tests__/**/*.test.ts"]
  }
});
