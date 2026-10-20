import { useCallback, useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { PlayerContext } from "./PlayerContextDef";
import {
  isNativePlatform,
  requestNotificationPermission,
  setupNativeMediaListener,
  stopNativeMedia,
  updateNativeMetadata,
  updateNativePlaybackState,
} from "../utils/nativeMediaControls";

// ---------------------------------------------------------------------------
// Switches / helpers
// ---------------------------------------------------------------------------

// Set to false to go back to plain <audio> playback with no Web Audio at all.
const ANALYSER_ENABLED = true;

const FAVORITES_KEY = "aether_favorites";
const VOLUME_KEY = "aether_volume";
const MUTED_KEY = "aether_muted";
const LAST_STATION_KEY = "aether_last_station";

// url -> false once we learn the server sends no CORS headers.
// Such streams still play, but the browser will not let us analyse them.
const corsSupport = new Map();

function loadFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveFavorites(favs) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
  } catch {
    /* quota / private-mode - ignore */
  }
}

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

function loadLastStation() {
  try {
    const raw = localStorage.getItem(LAST_STATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Minimal shape check — anything malformed is discarded.
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.streamUrl === "string" &&
      parsed.streamUrl.length > 0
    ) {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function saveLastStation(station) {
  try {
    if (!station || !station.streamUrl) {
      localStorage.removeItem(LAST_STATION_KEY);
      return;
    }
    localStorage.setItem(LAST_STATION_KEY, JSON.stringify(station));
  } catch {
    /* quota / private-mode - ignore */
  }
}

function stationKey(station) {
  return station?._id || station?.streamUrl || "";
}

function needsHls(url) {
  if (!url) return false;
  if (!url.includes(".m3u8")) return false;
  const audio = document.createElement("audio");
  return !audio.canPlayType("application/vnd.apple.mpegurl");
}

function deriveFormat(url) {
  if (!url) return "LIVE STREAM";
  const lower = url.toLowerCase();
  if (lower.includes(".m3u8")) return "HLS LIVE STREAM";
  if (lower.includes(".mp3")) return "MP3 LIVE STREAM";
  if (lower.includes(".aac")) return "AAC LIVE STREAM";
  if (lower.includes(".ogg")) return "OGG LIVE STREAM";
  return "LIVE STREAM";
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function PlayerProvider({ children }) {
  const audioRef = useRef(null);
  const unbindRef = useRef(null);
  const hlsRef = useRef(null);
  const stoppingRef = useRef(false);
  const hlsMediaRecoveredRef = useRef(false);
  const hlsNetworkRecoveredRef = useRef(false);

  // Web Audio
  const ctxRef = useRef(null);
  const analyserNodeRef = useRef(null);
  const sourceRef = useRef(null);
  // Exposed to the UI. Non-null ONLY while the current <audio> element is
  // routed through the analyser (i.e. real audio data is available).
  const analyserRef = useRef(null);

  // Playback bookkeeping.
  // Volume / mute refs read the same persisted values as the state below, so
  // the very first <audio> element picks up the restored settings.
  const tryingCorsRef = useRef(false);
  const stationRef = useRef(null);
  const retryRef = useRef(null);
  const volumeRef = useRef(loadVolume());
  const mutedRef = useRef(loadMuted());
  const stallTimerRef = useRef(null);
  const stallRetryCountRef = useRef(0);

  // The last station is restored paused — not played. Browsers block autoplay
  // with sound until a user gesture, so trying to play on mount would just
  // fail silently and confuse the status badge.
  const [current, setCurrent] = useState(loadLastStation);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(loadVolume);
  const [muted, setMuted] = useState(loadMuted);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | connecting | connected | error
  const [playlist, setPlaylist] = useState([]);
  const [index, setIndex] = useState(-1);
  const [favorites, setFavorites] = useState(loadFavorites);

  const clearStallTimer = useCallback(() => {
    if (stallTimerRef.current) {
      clearTimeout(stallTimerRef.current);
      stallTimerRef.current = null;
    }
  }, []);

  const handleStallTimeout = useCallback(() => {
    clearStallTimer();
    const station = stationRef.current || current;
    if (!station) return;
    if (stallRetryCountRef.current === 0) {
      stallRetryCountRef.current = 1;
      if (retryRef.current) {
        retryRef.current(station);
      }
    } else {
      setIsPlaying(false);
      setError("Stream stalled");
      setStatus("error");
    }
  }, [clearStallTimer, current]);

  // Persist favorites
  useEffect(() => {
    saveFavorites(favorites);
  }, [favorites]);

  // Persist volume
  useEffect(() => {
    try {
      localStorage.setItem(VOLUME_KEY, String(volume));
    } catch {
      /* ignore */
    }
  }, [volume]);

  // Persist muted
  useEffect(() => {
    try {
      localStorage.setItem(MUTED_KEY, muted ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [muted]);

  // Persist last station so reopening the app returns you to it, paused.
  useEffect(() => {
    saveLastStation(current);
  }, [current]);

  const destroyHls = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  }, []);

  // If an attempt made with crossorigin="anonymous" fails, the server almost
  // certainly lacks CORS headers. Remember that and retry as a plain element.
  const handleCorsFailure = useCallback(() => {
    if (!tryingCorsRef.current) return false;
    tryingCorsRef.current = false;
    const station = stationRef.current;
    if (!station) return false;
    corsSupport.set(station.streamUrl, false);
    if (retryRef.current) retryRef.current(station);
    return true;
  }, []);

  // Wire the listeners for one <audio> element. Returns an unbind function.
  const bindAudio = useCallback(
    (audio) => {
      const onPlay = () => setIsPlaying(true);

      const onPause = () => {
        clearStallTimer();
        setIsPlaying(false);
        setStatus((prev) => (prev === "error" ? "error" : "idle"));
      };

      const onPlaying = () => {
        clearStallTimer();
        stallRetryCountRef.current = 0;
        tryingCorsRef.current = false;
        const ctx = ctxRef.current;
        if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
        setStatus("connected");
      };

      const onStall = () => {
        setStatus("connecting");
        if (!stallTimerRef.current) {
          stallTimerRef.current = setTimeout(handleStallTimeout, 15000);
        }
      };

      const onWaiting = onStall;
      const onStalled = onStall;

      const onEnded = () => {
        if (stoppingRef.current) return;
        handleStallTimeout();
      };

      const onError = () => {
        clearStallTimer();
        if (stoppingRef.current) return;
        if (handleCorsFailure()) return;
        setIsPlaying(false);
        setError("Stream failed to load");
        setStatus("error");
      };

      audio.addEventListener("play", onPlay);
      audio.addEventListener("pause", onPause);
      audio.addEventListener("playing", onPlaying);
      audio.addEventListener("waiting", onWaiting);
      audio.addEventListener("stalled", onStalled);
      audio.addEventListener("ended", onEnded);
      audio.addEventListener("error", onError);

      return () => {
        audio.removeEventListener("play", onPlay);
        audio.removeEventListener("pause", onPause);
        audio.removeEventListener("playing", onPlaying);
        audio.removeEventListener("waiting", onWaiting);
        audio.removeEventListener("stalled", onStalled);
        audio.removeEventListener("ended", onEnded);
        audio.removeEventListener("error", onError);
      };
    },
    [clearStallTimer, handleCorsFailure, handleStallTimeout]
  );

  // A media element that has been routed into Web Audio cannot be un-routed,
  // so every playback start gets a fresh element.
  const makeAudio = useCallback(() => {
    if (unbindRef.current) {
      unbindRef.current();
      unbindRef.current = null;
    }
    try {
      if (sourceRef.current) sourceRef.current.disconnect();
    } catch {
      /* ignore */
    }
    sourceRef.current = null;
    analyserRef.current = null;

    const old = audioRef.current;
    if (old) {
      old.pause();
      old.removeAttribute("src");
      old.load();
    }

    const audio = new Audio();
    audio.preload = "none";
    audio.volume = volumeRef.current;
    audio.muted = mutedRef.current;
    audioRef.current = audio;
    unbindRef.current = bindAudio(audio);
    return audio;
  }, [bindAudio]);

  const connectAnalyser = useCallback((audio) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      if (!ctxRef.current) ctxRef.current = new AudioCtx();
      const ctx = ctxRef.current;
      if (ctx.state === "suspended") ctx.resume().catch(() => {});

      if (!analyserNodeRef.current) {
        const node = ctx.createAnalyser();
        node.fftSize = 512;
        node.smoothingTimeConstant = 0.7;
        node.minDecibels = -90;
        node.maxDecibels = -25;
        node.connect(ctx.destination);
        analyserNodeRef.current = node;
      }

      const source = ctx.createMediaElementSource(audio);
      source.connect(analyserNodeRef.current);
      sourceRef.current = source;
      analyserRef.current = analyserNodeRef.current;
    } catch (err) {
      console.warn("Analyser unavailable:", err);
      analyserRef.current = null;
    }
  }, []);

  const startPlayback = useCallback(
    (station) => {
      clearStallTimer();
      const url = station.streamUrl;

      stoppingRef.current = false;
      stationRef.current = station;
      destroyHls();
      hlsMediaRecoveredRef.current = false;
      hlsNetworkRecoveredRef.current = false;

      const viaHls = needsHls(url) && Hls.isSupported();
      // hls.js feeds the element a same-origin blob, so it can always be
      // analysed. Plain streams need CORS headers, so we try and fall back.
      const wantCors =
        ANALYSER_ENABLED && !viaHls && corsSupport.get(url) !== false;

      const audio = makeAudio();
      tryingCorsRef.current = wantCors;
      if (wantCors) audio.crossOrigin = "anonymous";
      if (ANALYSER_ENABLED && (wantCors || viaHls)) connectAnalyser(audio);

      if (viaHls) {
        const hls = new Hls();
        hls.loadSource(url);
        hls.attachMedia(audio);
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            if (
              data.type === Hls.ErrorTypes.MEDIA_ERROR &&
              !hlsMediaRecoveredRef.current
            ) {
              hlsMediaRecoveredRef.current = true;
              hls.recoverMediaError();
              return;
            }
            if (
              data.type === Hls.ErrorTypes.NETWORK_ERROR &&
              !hlsNetworkRecoveredRef.current
            ) {
              hlsNetworkRecoveredRef.current = true;
              hls.startLoad();
              return;
            }
            destroyHls();
            setError("HLS stream error");
            setStatus("error");
            setIsPlaying(false);
          }
        });
        hlsRef.current = hls;
      } else {
        audio.src = url;
      }

      audio.play().catch((err) => {
        if (err?.name === "AbortError") return;
        // A newer element has taken over; this failure is stale.
        if (audioRef.current !== audio) return;
        if (handleCorsFailure()) return;
        console.error("Audio playback error:", err);
        setIsPlaying(false);
        setError("Stream failed to load");
        setStatus("error");
      });
    },
    [clearStallTimer, connectAnalyser, destroyHls, handleCorsFailure, makeAudio]
  );

  useEffect(() => {
    retryRef.current = startPlayback;
  }, [startPlayback]);

  // Unmount cleanup
  useEffect(() => {
    return () => {
      clearStallTimer();
      if (unbindRef.current) unbindRef.current();
      if (audioRef.current) audioRef.current.pause();
    };
  }, [clearStallTimer]);

  const isCurrent = useCallback(
    (station) => {
      if (!current || !station) return false;
      return stationKey(current) === stationKey(station);
    },
    [current]
  );

  const play = useCallback(
    (station, list) => {
      if (!station || !station.streamUrl) return;

      const alreadyCurrent =
        current && stationKey(current) === stationKey(station);

      // Already current and healthy: skip re-init, only refresh the playlist.
      if (alreadyCurrent && audioRef.current && status !== "error") {
        if (Array.isArray(list) && list.length > 0) {
          const newIdx = list.findIndex(
            (s) => stationKey(s) === stationKey(station)
          );
          setPlaylist(list);
          setIndex(newIdx >= 0 ? newIdx : 0);
        }
        return;
      }

      setError(null);
      setCurrent(station);
      setStatus("connecting");

      if (Array.isArray(list) && list.length > 0) {
        setPlaylist(list);
        const idx = list.findIndex(
          (s) => stationKey(s) === stationKey(station)
        );
        setIndex(idx >= 0 ? idx : 0);
      } else {
        setPlaylist((prev) => (prev.length > 0 ? prev : [station]));
        setIndex(0);
      }

      startPlayback(station);
    },
    [current, startPlayback, status]
  );

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!current) return;

    if (isPlaying) {
      if (audio) audio.pause();
    } else {
      // If we restored a station on mount, audioRef is null until the first
      // play. startPlayback creates the element and starts it.
      setError(null);
      setStatus("connecting");
      startPlayback(current);
    }
  }, [current, isPlaying, startPlayback]);

  const stop = useCallback(() => {
    clearStallTimer();
    stoppingRef.current = true;
    tryingCorsRef.current = false;
    destroyHls();
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.src = "";
    }
    analyserRef.current = null;
    setCurrent(null);
    setIsPlaying(false);
    setError(null);
    setStatus("idle");
    setPlaylist([]);
    setIndex(-1);
    stopNativeMedia();
    try {
      localStorage.removeItem(LAST_STATION_KEY);
    } catch {
      /* ignore */
    }
  }, [clearStallTimer, destroyHls]);

  const next = useCallback(() => {
    if (playlist.length === 0) return;
    const nextIdx = (index + 1) % playlist.length;
    play(playlist[nextIdx], playlist);
  }, [index, play, playlist]);

  const prev = useCallback(() => {
    if (playlist.length === 0) return;
    const prevIdx = (index - 1 + playlist.length) % playlist.length;
    play(playlist[prevIdx], playlist);
  }, [index, play, playlist]);

  const handleSetVolume = useCallback((val) => {
    const newVol = Math.max(0, Math.min(1, val));
    volumeRef.current = newVol;
    setVolumeState(newVol);
    if (audioRef.current) audioRef.current.volume = newVol;
  }, []);

  const toggleMute = useCallback(() => {
    const nextMuted = !mutedRef.current;
    mutedRef.current = nextMuted;
    setMuted(nextMuted);
    if (audioRef.current) audioRef.current.muted = nextMuted;
  }, []);

  const isFavorite = useCallback(
    (station) => {
      const key = stationKey(station);
      return key ? favorites.includes(key) : false;
    },
    [favorites]
  );

  const toggleFavorite = useCallback((station) => {
    const key = stationKey(station);
    if (!key) return;
    setFavorites((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }, []);

  const format = deriveFormat(current?.streamUrl);

  const msRef = useRef({});
  const canSkip = playlist.length > 1;

  useEffect(() => {
    msRef.current = {
      play: () => {
        if (!isPlaying) toggle();
      },
      pause: () => {
        if (isPlaying) toggle();
      },
      stop,
      previoustrack: prev,
      nexttrack: next,
    };
  }, [isPlaying, toggle, stop, prev, next]);

  useEffect(() => {
    if (isNativePlatform()) return;
    if (!("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    const live = ["play", "pause", "stop"];
    const skip = ["previoustrack", "nexttrack"];
    for (const a of [...live, ...skip]) {
      const on = live.includes(a) || canSkip;
      try {
        ms.setActionHandler(a, on ? () => msRef.current[a]?.() : null);
      } catch {
        /* unsupported */
      }
    }
  }, [canSkip]);

  useEffect(() => {
    if (isNativePlatform()) return;
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = current
      ? new MediaMetadata({
          title: current.name,
          artist: current.genre || "Live radio",
          album: "Aether FM",
        })
      : null;
  }, [current]);

  useEffect(() => {
    if (isNativePlatform()) return;
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = !current
      ? "none"
      : isPlaying
      ? "playing"
      : "paused";
  }, [current, isPlaying]);

  // Sync metadata with native mobile notification
  useEffect(() => {
    if (current) {
      updateNativeMetadata({
        title: current.name,
        artist: current.genre || "Live radio",
      });
    }
  }, [current]);

  // Sync playback state with native mobile notification
  useEffect(() => {
    if (current) {
      updateNativePlaybackState({ isPlaying });
    }
  }, [current, isPlaying]);

  // Listen for actions from mobile lock screen & notification panel
  useEffect(() => {
    requestNotificationPermission();

    const unbind = setupNativeMediaListener((action) => {
      const handler = msRef.current[action];
      if (handler) {
        handler();
      } else if (action === "next") {
        msRef.current.nexttrack?.();
      } else if (action === "previous") {
        msRef.current.previoustrack?.();
      }
    });

    return unbind;
  }, []);

  return (
    <PlayerContext.Provider
      value={{
        current,
        isPlaying,
        volume,
        muted,
        error,
        status,
        format,
        playlist,
        index,
        play,
        toggle,
        stop,
        next,
        prev,
        setVolume: handleSetVolume,
        toggleMute,
        isCurrent,
        isFavorite,
        toggleFavorite,
        audioRef,
        analyserRef,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}