import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "#fbf9f5",
        foreground: "#30332e",
        surface: "#fbf9f5",
        "surface-container": "#eeeee8",
        "surface-container-low": "#f5f4ef",
        "surface-container-high": "#e8e9e2",
        primary: "#536441",
        "primary-dim": "#475736",
        "primary-container": "#d6e9bd",
        secondary: "#53616b",
        "secondary-container": "#d6e4f0",
        tertiary: "#685e48",
        "tertiary-container": "#f3e4c8",
        outline: "#797c75",
        "outline-variant": "#b1b3ab"
      },
      fontFamily: {
        body: ["var(--font-sans)"],
        headline: ["var(--font-serif)"]
      },
      borderRadius: {
        lg: "2rem",
        xl: "3rem"
      },
      boxShadow: {
        ambient: "0 12px 32px rgba(48, 51, 46, 0.04)"
      }
    }
  },
  plugins: []
};

export default config;

