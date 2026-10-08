import { useCallback, useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { PlayerContext } from "./PlayerContextDef";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FAVORITES_KEY = "aether_favorites";

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
    /* quota / private-mode – ignore */
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
  const hlsRef = useRef(null);
  const stoppingRef = useRef(false);
  const hlsMediaRecoveredRef = useRef(false);
  const hlsNetworkRecoveredRef = useRef(false);

  const [current, setCurrent] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | connecting | connected | error
  const [playlist, setPlaylist] = useState([]);
  const [index, setIndex] = useState(-1);
  const [favorites, setFavorites] = useState(loadFavorites);

  // Persist favorites
  useEffect(() => {
    saveFavorites(favorites);
  }, [favorites]);

  // Create the Audio element once
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "none";
    audio.volume = volume;
    audioRef.current = audio;

    const onPlay = () => {
      setIsPlaying(true);
    };

    const onPause = () => {
      setIsPlaying(false);
      setStatus((prev) => (prev === "error" ? "error" : "idle"));
    };

    const onPlaying = () => {
      setStatus("connected");
    };

    const onWaiting = () => {
      setStatus("connecting");
    };

    const onError = () => {
      // Ignore errors when we are stopping (src set to "")
      if (stoppingRef.current) return;
      setIsPlaying(false);
      setError("Stream failed to load");
      setStatus("error");
    };

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("error", onError);

    return () => {
      audio.pause();
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("error", onError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Destroy HLS helper
  const destroyHls = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  }, []);

  // Attach source (plain or HLS)
  const attachSource = useCallback(
    (audio, url) => {
      destroyHls();
      hlsMediaRecoveredRef.current = false;
      hlsNetworkRecoveredRef.current = false;

      if (needsHls(url) && Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(url);
        hls.attachMedia(audio);
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            if (data.type === Hls.ErrorTypes.MEDIA_ERROR && !hlsMediaRecoveredRef.current) {
              hlsMediaRecoveredRef.current = true;
              hls.recoverMediaError();
              return;
            }
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR && !hlsNetworkRecoveredRef.current) {
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
    },
    [destroyHls]
  );

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

      const audio = audioRef.current;
      const alreadyCurrent =
        current && stationKey(current) === stationKey(station);

      // Guard: if already current and status is not error, skip re-init.
      // Only update playlist/index if a new list was passed.
      if (alreadyCurrent && audio && status !== "error") {
        if (Array.isArray(list) && list.length > 0) {
          const newIdx = list.findIndex(
            (s) => stationKey(s) === stationKey(station)
          );
          setPlaylist(list);
          setIndex(newIdx >= 0 ? newIdx : 0);
        }
        return;
      }

      stoppingRef.current = false;
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

      if (audio) {
        attachSource(audio, station.streamUrl);
        audio.play().catch((err) => {
          if (err?.name === "AbortError") return;
          console.error("Audio playback error:", err);
          setIsPlaying(false);
          setError("Stream failed to load");
          setStatus("error");
        });
      }
    },
    [attachSource, current, status]
  );

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;

    if (isPlaying) {
      audio.pause();
    } else {
      stoppingRef.current = false;
      setError(null);
      setStatus("connecting");
      attachSource(audio, current.streamUrl);
      audio.play().catch((err) => {
        if (err?.name === "AbortError") return;
        console.error("Audio playback error:", err);
        setIsPlaying(false);
        setError("Stream failed to load");
        setStatus("error");
      });
    }
  }, [attachSource, current, isPlaying]);

  const stop = useCallback(() => {
    stoppingRef.current = true;
    destroyHls();
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.src = "";
    }
    setCurrent(null);
    setIsPlaying(false);
    setError(null);
    setStatus("idle");
    setPlaylist([]);
    setIndex(-1);
  }, [destroyHls]);

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
    setVolumeState(newVol);
    if (audioRef.current) {
      audioRef.current.volume = newVol;
    }
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      if (audioRef.current) {
        audioRef.current.muted = next;
      }
      return next;
    });
  }, []);

  const isFavorite = useCallback(
    (station) => {
      const key = stationKey(station);
      return key ? favorites.includes(key) : false;
    },
    [favorites]
  );

  const toggleFavorite = useCallback(
    (station) => {
      const key = stationKey(station);
      if (!key) return;
      setFavorites((prev) =>
        prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
      );
    },
    []
  );

  const format = deriveFormat(current?.streamUrl);

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
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}
