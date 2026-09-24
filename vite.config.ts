import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath, URL } from "node:url";
import { execSync } from "node:child_process";

// BF_PORTAL_BLOCK_v478_BUILD_STAMP - so "is it live?" can be read off a screenshot.
function buildSha(): string {
  const env = process.env.GITHUB_SHA || process.env.VITE_BUILD_SHA || "";
  if (env) return env.slice(0, 7);
  try { return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); } catch { return "unknown"; }
}

export default defineConfig({
  define: {
    __BUILD_SHA__: JSON.stringify(buildSha()),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    react(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "prompt",
      injectRegister: false,
      manifestFilename: "manifest.webmanifest",
      manifest: false,
      includeAssets: ["icons/**/*", "images/**/*", "favicon.ico"],
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,webp,woff,woff2,json}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024
      },
      devOptions: { enabled: false, type: "module" }
    }),
    tsconfigPaths({ projects: ["./tsconfig.json"] }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  // No test block here — vitest.config.ts owns test configuration
});
