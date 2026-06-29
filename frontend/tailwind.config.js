/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas:  "#f7f9fc",
        surface: "#f0f4f9",
        ink:     "#0f172a",
        body:    "#475569",
        muted:   "#94a3b8",
        line:    "#e7ebf3",
        brand: {
          50:  "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
        },
        income:  "#059669",
        expense: "#e11d48",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        // Layered depth + thin top-edge white line = subtle "glass card" feel
        card:   "0 1px 3px rgba(16,24,40,0.05), 0 4px 20px rgba(16,24,40,0.07), inset 0 1px 0 rgba(255,255,255,0.90)",
        soft:   "0 1px 3px rgba(16,24,40,0.04), 0 2px 8px rgba(16,24,40,0.04)",
        pop:    "0 12px 40px rgba(16,24,40,0.14), 0 2px 8px rgba(16,24,40,0.06), inset 0 1px 0 rgba(255,255,255,0.90)",
        lifted: "0 6px 28px rgba(16,24,40,0.11), 0 2px 6px rgba(16,24,40,0.06), inset 0 1px 0 rgba(255,255,255,0.90)",
      },
      borderRadius: {
        xl:  "0.875rem",
        "2xl": "1.125rem",
      },
    },
  },
  plugins: [],
};
