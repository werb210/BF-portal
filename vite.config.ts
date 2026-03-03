import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      manifest: {
        name: "Boreal Client Portal",
        short_name: "Boreal",
        description: "Boreal Financial Client Portal",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#020C1C",
        theme_color: "#020C1C",
        icons: [
          {
            src: "/icons/icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/icons/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any"
          }
        ]
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\/api\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              networkTimeoutSeconds: 10
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  },
  server: {
    port: 5173,
    strictPort: true
  },
  preview: {
    port: 4173
  },
  build: {
    sourcemap: false,
    minify: "esbuild"
  },
  esbuild: {
    drop: process.env.NODE_ENV === "production" ? ["console", "debugger"] : []
  }
});
