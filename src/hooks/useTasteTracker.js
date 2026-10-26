import { useEffect, useRef } from "react";
import { usePlayer } from "../context/usePlayer";
import { record, keyOf } from "../utils/tasteProfile";

/** Mount once inside <PlayerProvider>. Logs listens, skips and favorites. */
export function useTasteTracker() {
  const { current, isPlaying, isFavorite } = usePlayer();
  const sessionRef = useRef({ station: null, startedAt: null });
  const favRef = useRef({ key: "", value: false });

  const flush = () => {
    const { station, startedAt } = sessionRef.current;
    if (station && startedAt) {
      record(station, { seconds: (Date.now() - startedAt) / 1000 });
    }
    sessionRef.current = { station: null, startedAt: null };
  };

  // Listen sessions: starts on play, flushes on pause / station change.
  useEffect(() => {
    const s = sessionRef.current;
    if (isPlaying && current) {
      if (s.station && keyOf(s.station) !== keyOf(current)) flush();
      if (!sessionRef.current.startedAt) {
        sessionRef.current = { station: current, startedAt: Date.now() };
      }
    } else {
      flush();
    }
  }, [current, isPlaying]);

  // Flush when the app is hidden or closed.
  useEffect(() => {
    const onHide = () => document.visibilityState === "hidden" && flush();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
    };
  }, []);

  // Favorite toggles on the current station (isFavorite changes identity when favorites change).
  useEffect(() => {
    if (!current) return;
    const key = keyOf(current);
    const now = isFavorite(current);
    const prev = favRef.current;
    if (prev.key === key && prev.value !== now) {
      record(current, { kind: now ? "favorite" : "unfavorite" });
    }
    favRef.current = { key, value: now };
  }, [current, isFavorite]);
}