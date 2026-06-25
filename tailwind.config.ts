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
