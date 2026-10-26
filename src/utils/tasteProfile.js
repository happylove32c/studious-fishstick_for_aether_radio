// On-device taste profile. Nothing here ever leaves the device.
const KEY = "aether:taste:v1";
const HALF_LIFE_MS = 14 * 24 * 60 * 60 * 1000; // taste fades over ~2 weeks
const COLD_START_EVENTS = 10;
const EXPLORE_RATIO = 0.2;

const listeners = new Set();

function load() {
  try {
    const p = JSON.parse(localStorage.getItem(KEY));
    if (p && typeof p === "object" && p.genres) return p;
  } catch {
    /* ignore */
  }
  return { genres: {}, skipped: {}, stationW: {}, events: 0 };
}

let state = load();
state.stationW ||= {}; // older saved profiles

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* quota / private mode */
  }
  listeners.forEach((cb) => cb());
}

export function subscribe(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const g = (s) => (s?.genre || "Unknown").toLowerCase();
export const keyOf = (s) => s?._id || s?.streamUrl || "";
const decay = (t, now) => Math.pow(0.5, (now - t) / HALF_LIFE_MS);

function bump(genre, delta) {
  const now = Date.now();
  const e = state.genres[genre];
  const w = e ? e.w * decay(e.t, now) : 0;
  state.genres[genre] = { w: w + delta, t: now };
}

/** Log one listen. kind: "listen" | "favorite" | "unfavorite" */
export function record(station, { seconds = 0, kind = "listen" } = {}) {
  if (!station) return;
  const genre = g(station);
  let delta = 0;

  if (kind === "favorite") delta = 3;
  else if (kind === "unfavorite") delta = -3;
  else if (seconds >= 300) delta = 2;
  else if (seconds >= 30) delta = 1;
  else if (seconds > 0 && seconds < 15) {
    delta = -1;
    state.skipped[keyOf(station)] = Date.now();
  }
  if (kind === "listen" && seconds >= 30) {
    const now = Date.now();
    const e = state.stationW[keyOf(station)];
    const w = e ? e.w * decay(e.t, now) : 0;
    state.stationW[keyOf(station)] = { w: w + Math.min(seconds, 1800) / 60, t: now };
    state.last = keyOf(station);
  }
  if (!delta) return;

  bump(genre, delta);
  state.events += 1;
  save();
}

export function getGenreWeights() {
  const now = Date.now();
  const out = {};
  for (const [k, v] of Object.entries(state.genres)) out[k] = v.w * decay(v.t, now);
  return out;
}

/** Most recently listened station (any session), or null. */
export function getLastPlayed(stations) {
  if (!Array.isArray(stations) || !state.last) return null;
  return stations.find((s) => keyOf(s) === state.last) || null;
}

/** Station you have listened to most recently and most often (decayed), or null. */
export function getTopStation(stations) {
  if (!Array.isArray(stations)) return null;
  const now = Date.now();
  let best = null;
  let bestW = 0;
  for (const s of stations) {
    const e = state.stationW[keyOf(s)];
    if (!e) continue;
    const w = e.w * decay(e.t, now);
    if (w > bestW) {
      best = s;
      bestW = w;
    }
  }
  return best;
}

export const hasProfile = () => state.events >= COLD_START_EVENTS;

export function reset() {
  state = { genres: {}, skipped: {}, stationW: {}, events: 0 };
  save();
}

const shuffle = (a) => {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
};

/**
 * Rank stations for this device.
 * opts: { limit = 12, exclude = [keys] }
 */
export function recommend(stations, { limit = 12, exclude = [] } = {}) {
  if (!Array.isArray(stations) || !stations.length) return [];
  const skip = new Set(exclude);
  const pool = stations.filter((s) => !skip.has(keyOf(s)));

  // Cold start: diverse random picks, one per genre first.
  if (state.events < COLD_START_EVENTS) {
    const seen = new Set();
    const firsts = [];
    const rest = [];
    for (const s of shuffle(pool)) {
      if (!seen.has(g(s))) {
        seen.add(g(s));
        firsts.push(s);
      } else rest.push(s);
    }
    return [...firsts, ...rest].slice(0, limit);
  }

  const w = getGenreWeights();
  const max = Math.max(...Object.values(w), 1);
  const now = Date.now();

  const scored = pool.map((s) => {
    let score = (w[g(s)] ?? 0) / max; // -1..1
    const skippedAt = state.skipped[keyOf(s)];
    if (skippedAt) score -= 0.5 * decay(skippedAt, now);
    return { s, score: score + Math.random() * 0.1 }; // jitter
  });
  scored.sort((a, b) => b.score - a.score);

  const exploreN = Math.max(1, Math.round(limit * EXPLORE_RATIO));
  const topN = limit - exploreN;
  const top = scored.slice(0, topN).map((x) => x.s);
  const topKeys = new Set(top.map(keyOf));

  // Explore: genres you have little/no history with.
  const explore = shuffle(
    scored.filter((x) => !topKeys.has(keyOf(x.s)) && (w[g(x.s)] ?? 0) <= 0.5)
  )
    .slice(0, exploreN)
    .map((x) => x.s);

  // Interleave: explore picks land at roughly even spacing.
  const out = [...top];
  explore.forEach((s, i) => {
    out.splice(Math.min(out.length, (i + 1) * Math.floor(limit / (exploreN + 1))), 0, s);
  });
  return out.slice(0, limit);
}