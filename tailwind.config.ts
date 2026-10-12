import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "var(--ui-bg)",
          bgAlt: "var(--ui-surface)",
          surface: "var(--ui-surface-strong)",
          accent: "#F2994A",
          accentHover: "#E8892F",
        },
        // BF_PORTAL_v789_CONTRAST - theme tokens as utilities (text-ui-muted, bg-ui-surface, ...).
        ui: {
          text: "var(--ui-text)",
          muted: "var(--ui-text-muted)",
          danger: "var(--ui-text-danger)",
          success: "var(--ui-text-success)",
          surface: "var(--ui-surface-strong)",
          "surface-muted": "var(--ui-surface-muted)",
        },
      },
      borderColor: {
        subtle: "var(--ui-border-soft)",
        card: "var(--ui-border)",
      },
      boxShadow: {
        soft: "0 10px 30px rgba(0,0,0,0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
