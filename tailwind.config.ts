import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ─── Legacy aliases (keep for existing code) ─────────────────
        "chlorophyll": "#6EE384",
        "chlorophyll-dark": "#006e2d",
        "obsidian": "#0F1509",

        // ─── Stitch flat token names ──────────────────────────────────
        "obsidian-deep": "#0F1509",
        "chlorophyll-green": "#6EE384",
        "pure-white": "#FFFFFF",
        "background": "#f9f9f9",

        // Primary scale (dark forest green = Stitch "primary")
        primary: {
          DEFAULT: "#006e2d",
          dark: "#006e2d",
          container: "#6ee384",
          on: "#ffffff",
        },
        "primary-container": "#6ee384",
        "on-primary-container": "#006428",
        "primary-fixed": "#85fb99",
        "on-primary-fixed": "#002108",
        "primary-fixed-dim": "#69de7f",
        "on-primary-fixed-variant": "#005320",
        "inverse-primary": "#69de7f",

        // Secondary scale
        "secondary": "#5a6151",
        "secondary-container": "#dbe2ce",
        "on-secondary": "#ffffff",
        "on-secondary-container": "#5e6555",
        "secondary-fixed": "#dee5d1",
        "secondary-fixed-dim": "#c2c9b5",
        "on-secondary-fixed": "#171d11",
        "on-secondary-fixed-variant": "#42493a",

        // Tertiary scale
        "tertiary": "#5d5f5f",
        "tertiary-container": "#cbcbcb",
        "on-tertiary": "#ffffff",
        "on-tertiary-container": "#545656",
        "tertiary-fixed": "#e2e2e2",
        "tertiary-fixed-dim": "#c6c6c7",
        "on-tertiary-fixed": "#1a1c1c",
        "on-tertiary-fixed-variant": "#454747",

        // Surface system (nested for backward compat + flat for Stitch)
        surface: {
          DEFAULT: "#f9f9f9",
          mist: "#F0F0F0",
          white: "#FFFFFF",
          low: "#f3f3f4",
          container: "#eeeeee",
          high: "#e8e8e8",
          highest: "#e2e2e2",
        },
        "surface-mist": "#F0F0F0",
        "surface-bright": "#f9f9f9",
        "surface-dim": "#dadada",
        "surface-tint": "#006e2d",
        "surface-variant": "#e2e2e2",
        "surface-container": "#eeeeee",
        "surface-container-high": "#e8e8e8",
        "surface-container-highest": "#e2e2e2",
        "surface-container-low": "#f3f3f4",
        "surface-container-lowest": "#ffffff",
        "inverse-surface": "#2f3131",

        // On-color tokens (nested + flat)
        on: {
          surface: "#1a1c1c",
          "surface-variant": "#3e4a3d",
        },
        "on-surface": "#1a1c1c",
        "on-surface-variant": "#3e4a3d",
        "on-background": "#1a1c1c",
        "inverse-on-surface": "#f0f1f1",

        // Error
        error: {
          DEFAULT: "#ba1a1a",
        },
        "error-container": "#ffdad6",
        "on-error": "#ffffff",
        "on-error-container": "#93000a",

        // Status semantic tokens
        // current/now → uses existing `primary`
        status: {
          upcoming:  "#1B6AAB",   // mineral blue — forward, unscheduled horizon
          approved:  "#007868",   // teal-jade — resolved positively, distinct from primary
          cancelled: "#945200",   // dark amber — stopped deliberately, not a system error
          past:      "#6B5D52",   // warm stone — receded, historical
        },

        // Outline (nested + flat)
        outline: {
          DEFAULT: "#6e7a6c",
          variant: "#bdcaba",
        },
        "outline-variant": "#bdcaba",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        headline: ["Plus Jakarta Sans", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        DEFAULT: "0.5rem",
        sm: "0.25rem",
        md: "0.75rem",
        lg: "1rem",
        xl: "1.5rem",
      },
      boxShadow: {
        card: "0 1px 3px rgba(15, 21, 9, 0.04), 0 1px 2px rgba(15, 21, 9, 0.03)",
        modal: "0 8px 32px rgba(15, 21, 9, 0.12), 0 2px 8px rgba(15, 21, 9, 0.06)",
        "glass": "0 4px 24px rgba(15, 21, 9, 0.06)",
      },
      maxWidth: {
        container: "1280px",
      },
    },
  },
  plugins: [],
};

export default config;
