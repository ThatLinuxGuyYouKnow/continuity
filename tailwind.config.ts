import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        lime: {
          250: "#d9f99d",
          350: "#bef264",
          450: "#a3e635",
          550: "#84cc16",
        },
        violet: {
          250: "#ddd6fe",
          350: "#c4b5fd",
          450: "#a78bfa",
          550: "#8b5cf6",
        },
        navy: {
          900: "#050E1A",
          800: "#0A1628",
          700: "#111E32",
          600: "#1A2940",
        },
        dark: "#0A1628",
        surface: "#f8f9fb",
        muted: "#f0f2f5",
        panel: "#ffffff",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
