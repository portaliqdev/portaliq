import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Neutrals (cool slate) carry the layout.
        canvas: "#fbfbfc",
        base: "#fbfbfc",
        surface: { 1: "#ffffff", 2: "#f6f7f9", 3: "#eef0f3" },
        hairline: { DEFAULT: "#e3e6eb", strong: "#d2d7de", heavy: "#a8afba" },
        ink: {
          DEFAULT: "#14171c",
          sub: "#5a626e",
          muted: "#79818e",
          inverse: "#ffffff",
          disabled: "#a8afba",
        },
        // Single restrained blue action/identity accent.
        brand: {
          50: "#eff4ff",
          100: "#dbe6fe",
          200: "#bdd0fd",
          300: "#93b4fb",
          400: "#6090f7",
          500: "#3b72f0",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
        },
        // Back-compat accent aliases: red → brand blue, gold → amber-gold.
        md: {
          red: { DEFAULT: "#2563eb", hover: "#1d4ed8", dim: "#bdd0fd" },
          gold: { DEFAULT: "#b45309", hover: "#92400e", dim: "#fbf3da" },
        },
        sem: {
          success: "#16a34a",
          commit: "#15803d",
          target: "#b45309",
          contacted: "#0891b2",
          evaluating: "#7c3aed",
          watching: "#64748b",
          offer: "#2563eb",
          risk: "#d97706",
          danger: "#dc2626",
          lost: "#94a3b8",
          info: "#2563eb",
          gold: "#b45309",
        },
        pos: {
          qb: "#ea580c",
          rb: "#e11d48",
          wr: "#0284c7",
          te: "#0d9488",
          ol: "#7c3aed",
          dl: "#ca8a04",
          lb: "#059669",
          db: "#4f46e5",
          st: "#475569",
        },
        fit: {
          poor: "#dc2626",
          marginal: "#ea580c",
          solid: "#d4a017",
          strong: "#16a34a",
          elite: "#047857",
        },
      },
      fontFamily: {
        display: [
          "var(--font-display)",
          "Saira Condensed",
          "Oswald",
          "Arial Narrow",
          "system-ui",
          "sans-serif",
        ],
        sans: [
          "var(--font-sans)",
          "Hanken Grotesk",
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
        md: "0.5rem",
        lg: "0.75rem",
        xl: "1rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,20,28,0.04), 0 1px 1px rgba(16,20,28,0.03)",
        md: "0 4px 12px rgba(16,20,28,0.08), 0 2px 4px rgba(16,20,28,0.04)",
        lg: "0 12px 32px rgba(16,20,28,0.12), 0 4px 8px rgba(16,20,28,0.05)",
        pop: "0 8px 30px rgba(16,20,28,0.16)",
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
