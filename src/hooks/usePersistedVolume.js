import { useCallback, useEffect, useRef, useState } from "react";

const VOLUME_KEY = "aether_volume";
const MUTED_KEY = "aether_muted";

function loadVolume() {
  try {
    const raw = localStorage.getItem(VOLUME_KEY);
    if (raw === null) return 0.8;
    const n = Number(raw);
    return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0.8;
  } catch {
    return 0.8;
  }
}

function loadMuted() {
  try {
    return localStorage.getItem(MUTED_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Hook to manage audio volume and mute state with debounced persistence (300ms).
 *
 * @param {import("react").RefObject<HTMLAudioElement|null>} [audioRef]
 * @returns {{
 *   volume: number,
 *   muted: boolean,
 *   volumeRef: import("react").MutableRefObject<number>,
 *   mutedRef: import("react").MutableRefObject<boolean>,
 *   setVolume: (val: number) => void,
 *   toggleMute: () => void
 * }}
 */
export function usePersistedVolume(audioRef) {
  const volumeRef = useRef(loadVolume());
  const mutedRef = useRef(loadMuted());

  const [volume, setVolumeState] = useState(loadVolume);
  const [muted, setMuted] = useState(loadMuted);

  // Debounce volume writes at 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(VOLUME_KEY, String(volume));
      } catch {
        /* ignore */
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [volume]);

  // Debounce muted writes at 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(MUTED_KEY, muted ? "1" : "0");
      } catch {
        /* ignore */
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [muted]);

  const setVolume = useCallback(
    (val) => {
      const newVol = Math.max(0, Math.min(1, val));
      volumeRef.current = newVol;
      setVolumeState(newVol);
      if (audioRef?.current) audioRef.current.volume = newVol;
    },
    [audioRef]
  );

  const toggleMute = useCallback(() => {
    const nextMuted = !mutedRef.current;
    mutedRef.current = nextMuted;
    setMuted(nextMuted);
    if (audioRef?.current) audioRef.current.muted = nextMuted;
  }, [audioRef]);

  return {
    volume,
    muted,
    volumeRef,
    mutedRef,
    setVolume,
    toggleMute,
  };
}

export default usePersistedVolume;
