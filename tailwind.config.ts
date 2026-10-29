import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef6ff",
          100: "#d9eaff",
          500: "#1f6feb",
          600: "#1558c4",
          700: "#0f4699",
        },
      },
    },
  },
  plugins: [],
};

export default config;
