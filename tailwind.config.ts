import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#0B0B0C",
        base: "#101114",
        surface: { 1: "#16181D", 2: "#1E2127", 3: "#262A32" },
        hairline: { DEFAULT: "#23262D", strong: "#2E333C", heavy: "#3C424D" },
        ink: {
          DEFAULT: "#F4F5F7",
          sub: "#B6BAC2",
          muted: "#7C828C",
          inverse: "#0B0B0C",
          disabled: "#565B64",
        },
        md: {
          red: { DEFAULT: "#E21833", hover: "#C3142B", dim: "#7A1020" },
          gold: { DEFAULT: "#FFD520", hover: "#E6BE12", dim: "#8A7410" },
        },
        sem: {
          success: "#22C55E",
          commit: "#16A34A",
          target: "#FFD520",
          contacted: "#38BDF8",
          evaluating: "#A78BFA",
          watching: "#7C828C",
          offer: "#E21833",
          risk: "#F59E0B",
          danger: "#EF4444",
          lost: "#6B7280",
          info: "#60A5FA",
        },
        pos: {
          qb: "#F97316",
          rb: "#FB7185",
          wr: "#38BDF8",
          te: "#2DD4BF",
          ol: "#A78BFA",
          dl: "#FACC15",
          lb: "#34D399",
          db: "#818CF8",
          st: "#94A3B8",
        },
      },
      fontFamily: {
        display: [
          "var(--font-display)",
          "Saira Condensed",
          "Oswald",
          "Arial Narrow",
          "Helvetica Neue",
          "system-ui",
          "sans-serif",
        ],
        sans: [
          "var(--font-sans)",
          "Inter",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
        mono: ["var(--font-mono)", "JetBrains Mono", "ui-monospace", "monospace"],
      },
      fontSize: {
        label: ["0.6875rem", { lineHeight: "0.875rem", letterSpacing: "0.08em", fontWeight: "600" }],
        "stat-xl": ["1.75rem", { lineHeight: "1.875rem", fontWeight: "700" }],
      },
      borderRadius: {
        DEFAULT: "0.375rem",
        sm: "0.25rem",
        md: "0.4375rem",
      },
      boxShadow: {
        card: "0 1px 0 0 rgba(255,255,255,0.02), 0 2px 8px rgba(0,0,0,0.4)",
        pop: "0 8px 30px rgba(0,0,0,0.6)",
      },
      keyframes: {
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        shimmer: "shimmer 1.5s infinite",
      },
    },
  },
  plugins: [],
};

export default config;
