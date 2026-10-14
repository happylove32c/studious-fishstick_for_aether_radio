/** @type {import('tailwindcss').Config} */
export default {
  future: {
    hoverOnlyWhenSupported: true,
  },
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#FAF6EE",
        panel: "#FFFDF8",
        "panel-inset": "#F0EAE1",
        ink: "#1B1A17",
        "ink-muted": "#57534E",
        "status-amber": "#F59E0B",
        "status-amber-text": "#B45309",
        "status-red": "#EF4444",
        "status-red-text": "#B91C1C",
        "status-green": "#22C55E",
        "status-green-text": "#166534",
      },
      fontFamily: {
        fredoka: ["Fredoka", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
        jetbrains: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        panel: "24px",
        card: "18px",
        chunky: "12px",
        pill: "9999px",
      },
      boxShadow: {
        "hard-sm": "2px 2px 0px #1B1A17",
        hard: "4px 4px 0px #1B1A17",
        "hard-lg": "6px 6px 0px #1B1A17",
      },
      borderWidth: {
        3: "3px",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      transitionDuration: {
        tactile: "180ms",
      },
    },
  },
  plugins: [],
};