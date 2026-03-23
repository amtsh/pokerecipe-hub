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
      fontFamily: {
        sans: ["'Inter'", "system-ui", "sans-serif"],
      },
      // nor.ma-inspired tracking scale
      // Suisse Int'l feel: tight-to-neutral on body, very tight on display,
      // wide tracking only for uppercase label caps
      letterSpacing: {
        tightest:  "-0.05em",   // display / hero headings
        tighter:   "-0.03em",   // section headings
        tight:     "-0.015em",  // sub-headings, nav
        snug:      "-0.008em",  // body default (replaces 0 to feel more Swiss)
        normal:    "0em",
        label:     "0.12em",    // small uppercase labels
        widest:    "0.22em",    // hero eyebrows
      },
      // nor.ma line-height scale
      lineHeight: {
        heading:  "1.08",  // display headings - very tight
        title:    "1.18",  // section titles
        snug:     "1.35",  // sub-headings
        normal:   "1.5",   // body copy
        relaxed:  "1.6",   // long-form paragraphs
      },
      // nor.ma-inspired font-size steps (fluid-ready)
      fontSize: {
        "2xs":  ["0.6rem",  { lineHeight: "1" }],
        xs:     ["0.75rem", { lineHeight: "1.5" }],
        sm:     ["0.875rem",{ lineHeight: "1.5" }],
        base:   ["1rem",    { lineHeight: "1.5" }],
        lg:     ["1.125rem",{ lineHeight: "1.35" }],
        xl:     ["1.25rem", { lineHeight: "1.25" }],
        "2xl":  ["1.5rem",  { lineHeight: "1.18" }],
        "3xl":  ["1.875rem",{ lineHeight: "1.1" }],
        "4xl":  ["2.25rem", { lineHeight: "1.08" }],
        "5xl":  ["3rem",    { lineHeight: "1" }],
      },
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
