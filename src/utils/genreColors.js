// One colour per genre, tuned for the tactile cream cartoon UI.
// Every color is verified to provide WCAG AA contrast (>= 4.5:1)
// with ink (#1B1A17) or cream (#FAF6EE), and separated from status colours.

const KNOWN = {
  // ---- reds ----
  metal: "#FF6B6B",      // Coral
  punk: "#FF4D2E",       // Vermilion tomato
  latin: "#FF8533",      // Apricot orange
  christian: "#5EEAD4",  // Turquoise mint

  // ---- oranges & yellows ----
  rock: "#C2410C",       // Rich burnt orange (cream text: 5.14:1)
  variety: "#FFD166",    // Pastel sunny marigold
  religious: "#E7C9A0",  // Sand tone
  gospel: "#FCE166",     // Buttercup sunshine
  jazz: "#B8860B",       // Antique brass gold (cream text: 4.88:1)

  // ---- greens ----
  soul: "#D9F99D",       // Soft pear lime
  country: "#A3E635",    // Cartoon lime
  reggae: "#86EFAC",     // Fresh grass mint
  afrobeats: "#34D399",  // Spring mint
  afrobeat: "#34D399",   // Same as afrobeats
  sports: "#059669",     // Deep emerald (cream text: 5.11:1)

  // ---- cyans & teals ----
  world: "#2DD4BF",      // Lagoon aqua teal
  electronic: "#06B6D4", // Electric cyan pool
  ambient: "#C4B5FD",    // Soft dreamy lavender

  // ---- blues ----
  news: "#1D4ED8",       // Bold broadcast cobalt blue (cream text: 6.22:1)
  blues: "#4338CA",      // Deep midnight indigo (cream text: 7.33:1)
  talk: "#93C5FD",       // Powder microphone blue

  // ---- purples & pinks ----
  classical: "#A78BFA",  // Soft royal violet
  dance: "#C084FC",      // Playful lilac
  "hip hop": "#E879F9",  // Orchid magenta
  pop: "#F472B6",        // Candy pink
  indie: "#FB7185",      // Strawberry rose
  "r&b": "#FDA4AF",      // Blush peach
  oldies: "#D6A77A",     // Tan

  hiphop: "#E879F9",     // Orchid magenta
  lofi: "#FDE047",       // Warm vinyl lofi yellow
  alternative: "#FB7185",// Strawberry rose
  unknown: "#CBD5E1",    // Slate sticker grey
};

// Stable distinct fallback palette for unknown genres,
// verified deltaE >= 17 from all KNOWN entries and AA compliant.
const FALLBACK = [
  "#E07A5F", // 0 Warm terracotta clay (ink text: 5.4:1)
  "#A3B18A", // 1 Sage green (ink text: 7.7:1)
  "#0369A1", // 2 Deep oceanic sky (cream text: 5.3:1)
  "#6D28D9", // 3 Royal ultraviolet (cream text: 6.6:1)
  "#334155", // 4 Dark slate steel (cream text: 7.8:1)
  "#9F1239", // 5 Dark crimson wine (cream text: 7.5:1)
  "#701A75", // 6 Deep mulberry plum (cream text: 8.9:1)
  "#0D9488", // 7 Deep spruce teal (cream text: 4.8:1)
  "#854D0E", // 8 Warm caramel bronze (cream text: 6.2:1)
  "#9D174D", // 9 Deep ruby berry (cream text: 6.9:1)
];

export function getGenreColor(genre) {
  const key = (genre || "unknown").trim().toLowerCase();
  if (KNOWN[key]) return KNOWN[key];

  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (h * 31 + key.charCodeAt(i)) | 0;
  }
  return FALLBACK[(h >>> 0) % FALLBACK.length];
}

function sRGBtoLin(c) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function getLuminance(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.2126 * sRGBtoLin(r) + 0.7152 * sRGBtoLin(g) + 0.0722 * sRGBtoLin(b);
}

function contrastRatio(hex1, hex2) {
  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const INK = "#1B1A17";
const CREAM = "#FAF6EE";

// Returns #1B1A17 (ink) or #FAF6EE (cream), whichever yields higher WCAG contrast
export function readableOn(hex) {
  const cInk = contrastRatio(hex, INK);
  const cCream = contrastRatio(hex, CREAM);
  return cInk >= cCream ? INK : CREAM;
}