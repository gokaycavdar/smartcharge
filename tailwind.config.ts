import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "grid-smooth":
          "radial-gradient(circle at center, rgba(148, 163, 184, 0.12) 0, rgba(15, 23, 42, 0.08) 70%, rgba(15, 23, 42, 0.02) 100%)",
      },
      boxShadow: {
        glow: "0 0 40px rgba(16, 185, 129, 0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
