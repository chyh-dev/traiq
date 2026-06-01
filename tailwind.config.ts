import type { Config } from "tailwindcss";

const config: Config = {
  theme: {
    extend: {
      colors: {
        traiq: {
          base: "#0F1419",
          panel: "#1A1A2E",
          muted: "#16213E",
          lime: "#AEF78E",
          mint: "#B8F2E6",
          orange: "#FF6B35",
          title: "#FFFFFF",
          body: "#C8CDD5",
          subtext: "#8892A0",
          border: "#2A2A3E",
        },
      },
      fontFamily: {
        sans: ["Pretendard", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(174, 247, 142, 0.10), 0 24px 80px rgba(0, 0, 0, 0.35)",
      },
    },
  },
};

export default config;
