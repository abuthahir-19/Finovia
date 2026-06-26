/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Professional light fintech palette
        canvas: "#f7f9fc",
        ink: "#0f172a", // headings
        body: "#475569", // body text
        muted: "#94a3b8", // secondary text
        line: "#e7ebf3", // borders
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
        },
        income: "#059669",
        expense: "#e11d48",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        // Layered, soft elevation — subtle at rest, with a faint top highlight.
        card: "0 1px 2px rgba(16,24,40,0.04), 0 8px 24px rgba(16,24,40,0.06)",
        soft: "0 1px 3px rgba(16,24,40,0.04), 0 2px 8px rgba(16,24,40,0.04)",
        pop: "0 12px 40px rgba(16,24,40,0.12)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
      },
    },
  },
  plugins: [],
};
