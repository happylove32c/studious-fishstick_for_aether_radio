function hashToFreq(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  const norm = ((h >>> 0) % 2001) / 100; // 0.00 - 20.00
  return 88.0 + norm; // 88.0 - 108.0
}

export function getFrequency(station) {
  if (!station) return 88.0;
  if (station.frequency) return Number(station.frequency);
  const seed = station._id || station.name || "unknown";
  return Math.round(hashToFreq(seed) * 10) / 10;
}
