import { useState, useEffect, useRef } from "react";
import { getCached, fetchTrack } from "../utils/nowPlayingCache";
import {
  isNativePlatform,
  updateNativeMetadata,
} from "../utils/nativeMediaControls";

/**
 * Hook to poll and sync live now playing track metadata for a station.
 *
 * @param {Object} station - The active station object with _id, name, genre.
 * @param {boolean} active - Whether the station is currently playing / active.
 * @param {Object} options
 * @param {boolean} options.syncMetadata - Whether to sync track info to native notification & MediaSession.
 * @returns {{ artist: string|null, title: string|null, supported: boolean|null }}
 */
export function useNowPlayingTrack(
  station,
  active,
  { syncMetadata = false } = {}
) {
  const stationId = station?._id || null;
  const native = isNativePlatform();

  // Stored with stationId so changing stationId immediately resets track during render
  const [trackData, setTrackData] = useState({
    stationId: null,
    artist: null,
    title: null,
    supported: null,
  });

  const freshCached = stationId ? getCached(stationId, 15000) : null;

  const track =
    trackData.stationId === stationId
      ? {
          artist: trackData.artist,
          title: trackData.title,
          supported: trackData.supported,
        }
      : freshCached
      ? {
          artist: freshCached.artist,
          title: freshCached.title,
          supported: freshCached.supported,
        }
      : { artist: null, title: null, supported: null };

  const currentStationIdRef = useRef(null);
  const consecutiveFailuresRef = useRef(0);
  const supportedRef = useRef(null);
  const abortControllerRef = useRef(null);
  const lastFailureTimeRef = useRef(0);

  // Main polling & station change effect
  useEffect(() => {
    currentStationIdRef.current = stationId;
    consecutiveFailuresRef.current = 0;
    supportedRef.current = null;
    lastFailureTimeRef.current = 0;

    // Skip if station has no _id or not active
    if (!stationId || !active) {
      return () => {
        abortControllerRef.current?.abort();
      };
    }

    const loadTrack = async () => {
      if (!stationId) return;
      if (consecutiveFailuresRef.current >= 3) return;
      if (supportedRef.current === false) return;
      if (
        !native &&
        typeof document !== "undefined" &&
        document.visibilityState !== "visible"
      ) {
        return;
      }

      // If cache is fresh, skip network request
      const cached = getCached(stationId, 15000);
      if (cached) {
        supportedRef.current = cached.supported;
        consecutiveFailuresRef.current = 0;
        return;
      }

      // Abort previous in-flight fetch and start new fetch
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const data = await fetchTrack(stationId, controller.signal);
        if (currentStationIdRef.current !== stationId) return;

        consecutiveFailuresRef.current = 0;
        supportedRef.current = data.supported;
        setTrackData({
          stationId,
          artist: data.artist,
          title: data.title,
          supported: data.supported,
        });
      } catch (err) {
        if (err.name === "AbortError" || controller.signal.aborted) {
          return;
        }
        if (currentStationIdRef.current !== stationId) return;

        consecutiveFailuresRef.current += 1;
        lastFailureTimeRef.current = Date.now();
      }
    };

    // Fetch immediately
    loadTrack();

    // Poll every 20s while active and (native OR document is visible)
    const intervalId = setInterval(() => {
      // Failure reset after 2 minutes with no retries
      if (
        consecutiveFailuresRef.current >= 3 &&
        Date.now() - lastFailureTimeRef.current >= 120000
      ) {
        consecutiveFailuresRef.current = 0;
      }

      const visible =
        native ||
        (typeof document !== "undefined" &&
          document.visibilityState === "visible");

      if (
        active &&
        visible &&
        consecutiveFailuresRef.current < 3 &&
        supportedRef.current !== false
      ) {
        loadTrack();
      }
    }, 20000);

    const handleVisibilityChange = () => {
      if (native) return;
      if (
        document.visibilityState === "visible" &&
        active &&
        consecutiveFailuresRef.current < 3 &&
        supportedRef.current !== false
      ) {
        loadTrack();
      }
    };

    if (!native && typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    return () => {
      clearInterval(intervalId);
      if (!native && typeof document !== "undefined") {
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange
        );
      }
      abortControllerRef.current?.abort();
    };
  }, [stationId, active, native]);

  // Sync metadata with native notification & MediaSession when syncMetadata is true
  useEffect(() => {
    if (!syncMetadata || !station) return;

    const title = track.title || station.name || "Aether FM";
    const artist = track.artist || station.genre || "Live Radio";

    updateNativeMetadata({ title, artist });

    if (
      !isNativePlatform() &&
      "mediaSession" in navigator &&
      typeof MediaMetadata !== "undefined"
    ) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title,
          artist,
          album: "Aether FM",
        });
      } catch {
        // Ignore
      }
    }
  }, [syncMetadata, station, track.title, track.artist]);

  // Restore station defaults only on station change or unmount (syncMetadata true)
  const stationMetaRef = useRef(null);
  useEffect(() => {
    if (!syncMetadata || !station) return;
    stationMetaRef.current = {
      name: station.name,
      genre: station.genre || "Live Radio",
    };
    return () => {
      const meta = stationMetaRef.current;
      if (!meta) return;

      updateNativeMetadata({
        title: meta.name,
        artist: meta.genre,
      });

      if (
        !isNativePlatform() &&
        "mediaSession" in navigator &&
        typeof MediaMetadata !== "undefined"
      ) {
        try {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: meta.name,
            artist: meta.genre,
            album: "Aether FM",
          });
        } catch {
          // Ignore
        }
      }
    };
  }, [syncMetadata, station?._id, station]);

  return track;
}

export default useNowPlayingTrack;