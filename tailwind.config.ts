import type { Config } from "tailwindcss";

export default {
  content: [
    "{routes,islands,components}/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Noto Sans JP", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#faf6f1",
          100: "#f3e8d8",
          200: "#e8d0b0",
          300: "#d4a574",
          400: "#c0854a",
          500: "#a8652d",
          600: "#8b4f1f",
          700: "#6e3a17",
          800: "#522b11",
          900: "#371c0b",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
