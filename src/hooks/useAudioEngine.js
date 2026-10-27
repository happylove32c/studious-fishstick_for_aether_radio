import { useCallback, useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { stopNativeMedia } from "../utils/nativeMediaControls";

const ANALYSER_ENABLED = true;
const LAST_STATION_KEY = "aether_last_station";

// url -> false once we learn the server sends no CORS headers.
const corsSupport = new Map();

function loadLastStation() {
  try {
    const raw = localStorage.getItem(LAST_STATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
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
    /* ignore */
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

/**
 * Core audio playback engine supporting plain HTMLAudio, HLS.js, Web Audio analyser,
 * CORS fallback, and network/stall recovery.
 *
 * @param {Object} options
 * @param {import("react").MutableRefObject<number>} options.volumeRef
 * @param {import("react").MutableRefObject<boolean>} options.mutedRef
 * @param {() => void} [options.onStopRecording]
 */
export function useAudioEngine({ volumeRef, mutedRef, onStopRecording }) {
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
  const analyserRef = useRef(null);
  const recordDestRef = useRef(null);

  // Playback bookkeeping
  const tryingCorsRef = useRef(false);
  const stationRef = useRef(null);
  const retryRef = useRef(null);
  const stallTimerRef = useRef(null);
  const stallRetryCountRef = useRef(0);

  const [current, setCurrent] = useState(loadLastStation);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | connecting | connected | error
  const [playlist, setPlaylist] = useState([]);
  const [index, setIndex] = useState(-1);

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

  // Persist last station
  useEffect(() => {
    saveLastStation(current);
  }, [current]);

  const destroyHls = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  }, []);

  const handleCorsFailure = useCallback(() => {
    if (!tryingCorsRef.current) return false;
    tryingCorsRef.current = false;
    const station = stationRef.current;
    if (!station) return false;
    corsSupport.set(station.streamUrl, false);
    if (retryRef.current) retryRef.current(station);
    return true;
  }, []);

  // Wire listeners for an <audio> element
  const bindAudio = useCallback(
    (audio) => {
      const onPlay = () => setIsPlaying(true);

      const onPause = () => {
        clearStallTimer();
        onStopRecording?.();
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
        onStopRecording?.();
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
    [clearStallTimer, handleCorsFailure, handleStallTimeout, onStopRecording]
  );

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
    if (volumeRef) audio.volume = volumeRef.current;
    if (mutedRef) audio.muted = mutedRef.current;
    audioRef.current = audio;
    unbindRef.current = bindAudio(audio);
    return audio;
  }, [bindAudio, mutedRef, volumeRef]);

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

      if (!recordDestRef.current && ctx.createMediaStreamDestination) {
        recordDestRef.current = ctx.createMediaStreamDestination();
      }

      const source = ctx.createMediaElementSource(audio);
      source.connect(analyserNodeRef.current);
      if (recordDestRef.current) {
        source.connect(recordDestRef.current);
      }
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
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("aether:live-play"));
      }
      destroyHls();
      hlsMediaRecoveredRef.current = false;
      hlsNetworkRecoveredRef.current = false;

      const viaHls = needsHls(url) && Hls.isSupported();
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
            onStopRecording?.();
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
        if (audioRef.current !== audio) return;
        if (handleCorsFailure()) return;
        onStopRecording?.();
        console.error("Audio playback error:", err);
        setIsPlaying(false);
        setError("Stream failed to load");
        setStatus("error");
      });
    },
    [clearStallTimer, connectAnalyser, destroyHls, handleCorsFailure, makeAudio, onStopRecording]
  );

  useEffect(() => {
    retryRef.current = startPlayback;
  }, [startPlayback]);

  // Unmount cleanup
  useEffect(() => {
    return () => {
      clearStallTimer();
      destroyHls();
      if (unbindRef.current) unbindRef.current();
      if (audioRef.current) audioRef.current.pause();
    };
  }, [clearStallTimer, destroyHls]);

  const getRecordStream = useCallback(() => {
    if (!sourceRef.current || !recordDestRef.current) return null;
    return recordDestRef.current.stream || null;
  }, []);

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

      // Already current and healthy: skip re-init, only refresh playlist
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

      onStopRecording?.();

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
    [current, onStopRecording, startPlayback, status]
  );

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!current) return;

    if (isPlaying) {
      if (audio) audio.pause();
    } else {
      setError(null);
      setStatus("connecting");
      startPlayback(current);
    }
  }, [current, isPlaying, startPlayback]);

  const stop = useCallback(() => {
    clearStallTimer();
    onStopRecording?.();
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
  }, [clearStallTimer, destroyHls, onStopRecording]);

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

  const format = deriveFormat(current?.streamUrl);

  return {
    current,
    isPlaying,
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
    isCurrent,
    setError,
    audioRef,
    analyserRef,
    getRecordStream,
  };
}

export default useAudioEngine;
