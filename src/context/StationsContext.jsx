import { useCallback, useEffect, useState } from "react";
import { StationsContext } from "./StationsContextDef";

const API = "https://laughing-barnacle-ashn.onrender.com/stations";
const CACHE_KEY = "aether:stations:v2";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

// ---------------------------------------------------------------------------
// Normalisation helpers
// ---------------------------------------------------------------------------

function normalizeStation(raw) {
  if (!raw || typeof raw !== "object") return null;
  const streamUrl = raw.streamUrl ?? raw.url ?? raw.stream;
  if (!streamUrl) return null;
  const name = raw.name ?? raw.title ?? "Untitled";
  const genre =
    typeof raw.genre === "string" && raw.genre.trim()
      ? raw.genre.trim()
      : "Unknown";

  return {
    ...raw,
    name,
    streamUrl,
    genre,
  };
}

function normalizeStations(list) {
  if (!Array.isArray(list)) return [];
  return list.map(normalizeStation).filter(Boolean);
}

// ---------------------------------------------------------------------------
// localStorage helpers – every access wrapped in try/catch
// ---------------------------------------------------------------------------

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.ts === "number" &&
      Array.isArray(parsed.data) &&
      parsed.data.length > 0
    ) {
      const normalized = normalizeStations(parsed.data);
      if (normalized.length > 0) {
        return { ts: parsed.ts, data: normalized };
      }
    }
    // Invalid shape – discard
    localStorage.removeItem(CACHE_KEY);
  } catch {
    try { localStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
  }
  return null;
}

function writeCache(data) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ ts: Date.now(), data })
    );
  } catch {
    /* quota exceeded or storage blocked – ignore */
  }
}

// ---------------------------------------------------------------------------
// Lazy initialiser – runs in useState(), not in an effect
// ---------------------------------------------------------------------------

function initFromCache() {
  const entry = readCache();
  if (entry) {
    const fresh = Date.now() - entry.ts < CACHE_TTL_MS;
    return {
      stations: entry.data,
      loading: false,       // we have data → no loading state
      error: null,
      needsFetch: !fresh,   // stale → background refresh
    };
  }
  return {
    stations: [],
    loading: true,          // no data at all → show loading
    error: null,
    needsFetch: true,
  };
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function StationsProvider({ children }) {
  const [state, setState] = useState(() => {
    const initial = initFromCache();
    return {
      stations: initial.stations,
      loading: initial.loading,
      error: initial.error,
      needsFetch: initial.needsFetch,
    };
  });
  const [initialNeedsFetch] = useState(state.needsFetch);

  // Fetch helper – returns the data array or throws
  const fetchStations = useCallback(async () => {
    const res = await fetch(API);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const list = Array.isArray(data) ? data : data?.stations || [];
    return normalizeStations(list);
  }, []);

  // Initial / stale-refresh effect
  useEffect(() => {
    if (!initialNeedsFetch) return;

    let cancelled = false;

    (async () => {
      try {
        const data = await fetchStations();
        if (cancelled) return;
        writeCache(data);
        setState({ stations: data, loading: false, error: null });
      } catch (err) {
        if (cancelled) return;
        // If we already had cached (stale) data, keep it – no error shown.
        setState((prev) => {
          if (prev.stations.length > 0) {
            return { ...prev, loading: false };
          }
          // No cached data at all – show the error
          return { stations: [], loading: false, error: err.message };
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initialNeedsFetch, fetchStations]);

  // Manual reload – ignores TTL, always refetches
  const reload = useCallback(() => {
    // Only set loading if we have no data yet
    setState((prev) => ({
      ...prev,
      loading: prev.stations.length === 0,
      error: null,
    }));

    fetchStations()
      .then((data) => {
        writeCache(data);
        setState({ stations: data, loading: false, error: null });
      })
      .catch((err) => {
        setState((prev) => {
          if (prev.stations.length > 0) {
            return { ...prev, loading: false };
          }
          return { stations: [], loading: false, error: err.message };
        });
      });
  }, [fetchStations]);

  const value = {
    stations: state.stations,
    loading: state.loading,
    error: state.error,
    reload,
  };

  return (
    <StationsContext.Provider value={value}>
      {children}
    </StationsContext.Provider>
  );
}
