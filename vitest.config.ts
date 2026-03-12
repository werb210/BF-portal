import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: ["src/test/setup.ts"],
      include: ["src/__tests__/**/*.test.ts", "src/__tests__/**/*.test.tsx"],
      exclude: ["tests/e2e/**", "node_modules/**"],
    },
  })
);
