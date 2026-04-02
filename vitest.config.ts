import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    setupFiles: ["./src/setupTests.ts", "./src/test/setupEnv.ts", "./src/test/setup.ts"],
    environment: "jsdom",
    globals: true,
  },
});
