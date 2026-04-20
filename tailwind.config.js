/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        mono: [
          "JetBrains Mono",
          "Fira Code",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      colors: {
        // Conceptual colors for byte highlighting
        proto: {
          frame: "#eab308",      // yellow  — H2/H3 frame header
          pseudo: "#a855f7",     // purple — :method, :path, etc
          header: "#3b82f6",     // blue   — standard headers
          body: "#22c55e",       // green  — DATA / body bytes
          crlf: "#ef4444",       // red    — HTTP/1.1 CRLF
          method: "#f97316",     // orange — HTTP/1.1 method
          path: "#06b6d4",       // cyan   — HTTP/1.1 path
          version: "#ec4899",    // pink   — HTTP/1.1 version
        },
      },
      keyframes: {
        pulseGlow: {
          "0%,100%": { boxShadow: "0 0 0 0 rgba(34, 197, 94, 0.0)" },
          "50%": { boxShadow: "0 0 18px 2px rgba(34, 197, 94, 0.35)" },
        },
      },
    },
  },
  plugins: [],
};
