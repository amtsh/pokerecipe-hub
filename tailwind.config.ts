import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: { sans: ["'Inter'", "system-ui", "sans-serif"] },
      colors: {
        // Light mode palette
        ink:    "#0a0a0a",
        muted:  "#6b6b6b",
        faint:  "#b3b3b3",
        rule:   "#e8e8e8",
        canvas: "#ffffff",
        lift:   "#f7f7f7",
        // Dark mode palette
        darkBg:      "#0a0a0a",
        darkSurface: "#111111",
        darkInput:   "#181818",
        darkBorder:  "#272727",
        darkMuted:   "#8a8a8a",
        darkFaint:   "#555555",
      },
      maxWidth: { content: "680px", wide: "1000px" },
    },
  },
  plugins: [],
};
export default config;
