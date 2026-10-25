import { API_BASE } from "./api";

const cache = new Map();
const inFlight = new Map();

/**
 * Retrieves cached now playing track for a station if under maxAgeMs.
 */
export function getCached(id, maxAgeMs = 15000) {
  if (!id) return null;
  const entry = cache.get(id);
  if (!entry) return null;
  if (Date.now() - entry.ts < maxAgeMs) {
    return entry.data;
  }
  return null;
}

/**
 * Stores now playing track data in cache with current timestamp.
 */
export function setCached(id, data) {
  if (!id) return;
  cache.set(id, {
    data,
    ts: Date.now(),
  });
}

/**
 * Fetches now playing track data, deduping in-flight requests and writing to cache.
 */
export function fetchTrack(id, signal) {
  if (!id) {
    return Promise.reject(new Error("Missing station id"));
  }

  if (inFlight.has(id)) {
    return inFlight.get(id);
  }

  const promise = (async () => {
    try {
      const res = await fetch(
        `${API_BASE}/nowplaying?id=${encodeURIComponent(id)}`,
        { signal }
      );
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json = await res.json();
      const result = {
        artist: json?.artist ?? null,
        title: json?.title ?? null,
        supported: Boolean(json?.supported),
      };
      setCached(id, result);
      return result;
    } finally {
      inFlight.delete(id);
    }
  })();

  inFlight.set(id, promise);
  return promise;
}
