/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        serif: ["Playfair Display", "serif"],
        mono: ["Roboto Mono", "monospace"],
      },
      colors: {
        // Softer light mode colors
        "light-bg": "#f5f5f7",
        "light-bg-secondary": "#eeeef0",
        "light-card": "#ffffff",
      },
      backgroundColor: {
        // Override white to be slightly gray in light mode
        page: "#f5f5f7",
      },
    },
  },
  plugins: [],
};
