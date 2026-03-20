import type { Config } from "tailwindcss";
const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: { sans: ["'Inter'", "system-ui", "sans-serif"] },
      colors: {
        ink: "#0a0a0a",
        muted: "#6b6b6b",
        faint: "#b3b3b3",
        rule: "#e8e8e8",
        canvas: "#ffffff",
        lift: "#f7f7f7",
      },
      maxWidth: { content: "680px", wide: "1000px" },
    },
  },
  plugins: [],
};
export default config;
