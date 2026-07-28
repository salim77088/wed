/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{html,js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Veil dark theme — privacy-focused, modern
        veil: {
          950: "#0a0d12",
          900: "#0f131a",
          850: "#141923",
          800: "#1a2030",
          700: "#252d3f",
          600: "#3a4258",
          500: "#5a6378",
          400: "#8b94a8",
          300: "#b8bfcc",
          200: "#d8dde6",
          100: "#eef0f4",
          accent: "#00d9ff",
          accent2: "#7c5cff",
          success: "#22c55e",
          warning: "#f59e0b",
          danger: "#ef4444",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Menlo", "monospace"],
      },
      boxShadow: {
        glow: "0 0 24px -4px rgba(0, 217, 255, 0.35)",
      },
      animation: {
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
