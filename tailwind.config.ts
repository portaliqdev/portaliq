import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Neutrals (deep, cool) carry the layout — driven by CSS vars so the
        // whole system can be re-themed from one place.
        canvas: "var(--canvas)",
        base: "var(--base)",
        surface: {
          1: "var(--surface-1)",
          2: "var(--surface-2)",
          3: "var(--surface-3)",
        },
        hairline: {
          DEFAULT: "var(--border-default)",
          subtle: "var(--border-subtle)",
          strong: "var(--border-strong)",
          heavy: "var(--border-heavy)",
        },
        ink: {
          DEFAULT: "var(--text-primary)",
          sub: "var(--text-secondary)",
          muted: "var(--text-muted)",
          inverse: "var(--text-inverse)",
          disabled: "var(--text-disabled)",
        },
        // Single refined blue-indigo action/identity accent.
        brand: {
          50: "var(--brand-50)",
          100: "var(--brand-100)",
          200: "var(--brand-200)",
          300: "var(--brand-300)",
          400: "var(--brand-400)",
          500: "var(--brand-500)",
          600: "var(--brand-600)",
          700: "var(--brand-700)",
          800: "var(--brand-800)",
          900: "var(--brand-900)",
        },
        amber: {
          300: "var(--amber-300)",
          400: "var(--amber-400)",
          500: "var(--amber-500)",
          600: "var(--amber-600)",
        },
        // Back-compat accent aliases: red → brand blue, gold → amber.
        md: {
          red: { DEFAULT: "var(--brand-500)", hover: "var(--brand-400)", dim: "var(--brand-200)" },
          gold: { DEFAULT: "var(--amber-500)", hover: "var(--amber-400)", dim: "var(--brand-100)" },
        },
        sem: {
          success: "var(--sem-success)",
          commit: "var(--sem-commit)",
          target: "var(--sem-target)",
          contacted: "var(--sem-contacted)",
          evaluating: "var(--sem-evaluating)",
          watching: "var(--sem-watching)",
          offer: "var(--sem-offer)",
          risk: "var(--sem-risk)",
          danger: "var(--sem-danger)",
          lost: "var(--sem-lost)",
          info: "var(--sem-info)",
          gold: "var(--sem-gold)",
        },
        pos: {
          qb: "var(--pos-qb)",
          rb: "var(--pos-rb)",
          wr: "var(--pos-wr)",
          te: "var(--pos-te)",
          ol: "var(--pos-ol)",
          dl: "var(--pos-dl)",
          lb: "var(--pos-lb)",
          db: "var(--pos-db)",
          st: "var(--pos-st)",
        },
        fit: {
          poor: "var(--fit-poor)",
          marginal: "var(--fit-marginal)",
          solid: "var(--fit-solid)",
          strong: "var(--fit-strong)",
          elite: "var(--fit-elite)",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Inter", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "ui-monospace", "monospace"],
      },
      fontSize: {
        label: ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.12em", fontWeight: "500" }],
        "stat-xl": ["1.875rem", { lineHeight: "2rem", letterSpacing: "-0.02em", fontWeight: "700" }],
      },
      borderRadius: {
        DEFAULT: "0.625rem", // 10
        sm: "0.375rem", // 6
        md: "0.5rem", // 8
        lg: "0.75rem", // 12
        xl: "1rem", // 16
        "2xl": "1.25rem", // 20
      },
      boxShadow: {
        xs: "var(--shadow-xs)",
        card: "var(--shadow-card)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        pop: "var(--shadow-pop)",
        glow: "var(--shadow-glow)",
        focus: "var(--shadow-focus)",
      },
      transitionTimingFunction: {
        out: "var(--ease-out)",
        smooth: "var(--ease-in-out)",
      },
      keyframes: {
        shimmer: { "100%": { transform: "translateX(100%)" } },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.97)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "glow-pulse": { "0%,100%": { opacity: "0.6" }, "50%": { opacity: "1" } },
        blink: { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.25" } },
      },
      animation: {
        shimmer: "shimmer 1.6s infinite",
        "fade-up": "fade-up var(--duration-page) var(--ease-out) both",
        "fade-in": "fade-in var(--duration-slow) var(--ease-out) both",
        "scale-in": "scale-in var(--duration-base) var(--ease-out) both",
        "glow-pulse": "glow-pulse 2.4s ease-in-out infinite",
        blink: "blink 1.1s steps(2) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
