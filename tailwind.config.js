/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{html,js,ts,jsx,tsx}", "./public/**/*.html"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Veil 2026 — refined, professional browser palette
        // Inspired by Chrome/Brave/Arc with a distinctive identity
        veil: {
          // Backgrounds — cool, slightly blue-tinted dark
          950: "#0d0e11",     // deepest
          900: "#141518",     // main bg
          880: "#191b1f",     // toolbar bg
          850: "#1e2024",     // elevated surface
          800: "#25272b",     // hover surface
          750: "#2a2d31",     // active surface
          700: "#32353a",     // borders strong
          600: "#3f4348",     // borders
          500: "#5f6368",     // muted text / icons
          400: "#80848b",     // secondary text
          300: "#a8acb3",     // text muted
          200: "#c8ccd2",     // text default
          100: "#e8eaed",     // text bright
          50: "#f8f9fa",      // text brightest
          // Accents — professional blue (like Chrome/Brave)
          accent: "#4f9eff",
          accentHover: "#3b8ee0",
          accentSoft: "rgba(79, 158, 255, 0.12)",
          // Private mode — purple
          private: "#a855f7",
          privateSoft: "rgba(168, 85, 247, 0.12)",
          // Status
          success: "#22c55e",
          warning: "#f59e0b",
          danger: "#ef4444",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Menlo", "monospace"],
      },
      fontSize: {
        "2xs": ["11px", "14px"],
      },
      boxShadow: {
        "sm": "0 1px 2px rgba(0,0,0,0.3)",
        "md": "0 2px 8px rgba(0,0,0,0.3)",
        "lg": "0 8px 24px rgba(0,0,0,0.4)",
        "tab-active": "0 -2px 0 0 var(--veil-tab-active) inset",
      },
      animation: {
        "fade-in": "fade-in 0.15s ease-out",
        "slide-up": "slide-up 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-down": "slide-down 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        "fade-in": { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        "slide-up": { "0%": { transform: "translateY(8px)", opacity: "0" }, "100%": { transform: "translateY(0)", opacity: "1" } },
        "slide-down": { "0%": { transform: "translateY(-8px)", opacity: "0" }, "100%": { transform: "translateY(0)", opacity: "1" } },
      },
    },
  },
  plugins: [],
};
