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

        "light-bg": "#f5f5f7",
        "light-bg-secondary": "#eeeef0",
        "light-card": "#ffffff",
      },
      backgroundColor: {

        page: "#f5f5f7",
      },
    },
  },
  plugins: [],
};
