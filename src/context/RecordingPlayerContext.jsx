import { useCallback, useEffect, useRef, useState } from "react";
import { RecordingPlayerContext } from "./RecordingPlayerContextDef";
import { usePlayer } from "./usePlayer";
import {
  getRecordingBlob,
  listRecordings,
  subscribe,
} from "../utils/recordingsStore";
import {
  isNativePlatform,
  setupNativeMediaListener,
  stopNativeMedia,
  updateNativeOfflinePlayback,
} from "../utils/nativeMediaControls";

const VALID_RATES = [1, 1.25, 1.5, 2];

export function RecordingPlayerProvider({ children }) {
  const livePlayer = usePlayer();

  const [currentRec, setCurrentRec] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [rate, setRateState] = useState(1);

  const audioRef = useRef(null);
  const blobUrlRef = useRef(null);
  const currentRecRef = useRef(null);
  const isPlayingRef = useRef(false);
  const rateRef = useRef(1);
  const lastPushTimeRef = useRef(0);
  const isPreparingRef = useRef(false);

  // Sync refs with state
  useEffect(() => {
    currentRecRef.current = currentRec;
  }, [currentRec]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    rateRef.current = rate;
  }, [rate]);

  const duration = currentRec?.durationSec || 0;

  // Push native lock screen / notification updates
  const pushNative = useCallback((posSec, playingState) => {
    const rec = currentRecRef.current;
    if (!rec) return;

    const isPlay =
      playingState !== undefined ? playingState : isPlayingRef.current;
    const durMs = (rec.durationSec || 0) * 1000;
    const currentSec =
      posSec !== undefined ? posSec : audioRef.current?.currentTime || 0;
    const posMs = Math.max(0, Math.min(durMs, Math.round(currentSec * 1000)));

    lastPushTimeRef.current = Date.now();
    updateNativeOfflinePlayback({
      title: rec.name || "Recording",
      durationMs: durMs,
      positionMs: posMs,
      isPlaying: isPlay,
      offline: true,
      speed: rateRef.current,
    });
  }, []);

  // Stop recording player
  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.src = "";
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setCurrentRec(null);
    currentRecRef.current = null;
    setIsPlaying(false);
    isPlayingRef.current = false;
    setPosition(0);
    stopNativeMedia();
  }, []);

  // Single audio element setup & event listeners
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "auto";
    audioRef.current = audio;

    const onTimeUpdate = () => {
      if (isPreparingRef.current) return;
      const cur = audio.currentTime;
      setPosition(cur);

      const now = Date.now();
      if (now - lastPushTimeRef.current >= 1000) {
        lastPushTimeRef.current = now;
        pushNative(cur);
      }
    };

    const onEnded = () => {
      setIsPlaying(false);
      setPosition(0);
      audio.currentTime = 0;
      pushNative(0, false);
    };

    const onError = (e) => {
      if (audio.src && !isPreparingRef.current) {
        console.warn("Recording audio element error:", e);
        setIsPlaying(false);
      }
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audio.pause();
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [pushNative]);

  // Keep currentRec metadata synchronized if renamed or deleted in store
  useEffect(() => {
    return subscribe((list) => {
      if (!currentRecRef.current) return;
      const match = list.find((r) => r.id === currentRecRef.current.id);
      if (!match) {
        // Recording was deleted
        stop();
      } else if (match.name !== currentRecRef.current.name) {
        setCurrentRec(match);
      }
    });
  }, [stop]);

  // Seek function
  const seek = useCallback(
    (sec) => {
      const audio = audioRef.current;
      const dur = currentRecRef.current?.durationSec || 0;
      if (!audio) return;

      const target = Math.max(0, Math.min(dur > 0 ? dur : Infinity, sec));
      try {
        audio.currentTime = target;
      } catch (err) {
        console.warn("Audio seek error:", err);
      }
      setPosition(target);
      pushNative(target, isPlayingRef.current);
    },
    [pushNative]
  );

  // Skip function (±sec)
  const skip = useCallback(
    (deltaSec) => {
      const audio = audioRef.current;
      if (!audio) return;
      const cur = audio.currentTime;
      seek(cur + deltaSec);
    },
    [seek]
  );

  // Set playback rate (1, 1.25, 1.5, 2)
  const setRate = useCallback(
    (newRate) => {
      const rateToSet = VALID_RATES.includes(newRate) ? newRate : 1;
      setRateState(rateToSet);
      rateRef.current = rateToSet;
      if (audioRef.current) {
        audioRef.current.playbackRate = rateToSet;
      }
      pushNative(audioRef.current?.currentTime || 0, isPlayingRef.current);
    },
    [pushNative]
  );

  // Play recording by ID
  const play = useCallback(
    async (id) => {
      const list = listRecordings();
      const rec = list.find((r) => r.id === id);
      if (!rec) return;

      // 1. Starting playback calls the live player's stop-or-pause first.
      if (livePlayer.isPlaying || livePlayer.current) {
        livePlayer.stop();
      }

      // If already current and loaded, resume if paused
      if (currentRecRef.current?.id === rec.id && audioRef.current?.src) {
        if (audioRef.current.paused) {
          try {
            await audioRef.current.play();
            setIsPlaying(true);
            pushNative(audioRef.current.currentTime, true);
          } catch (err) {
            console.error("Resume recording playback error:", err);
          }
        }
        return;
      }

      setCurrentRec(rec);
      currentRecRef.current = rec;
      setPosition(0);

      const audio = audioRef.current;
      if (!audio) return;

      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }

      const blob = await getRecordingBlob(rec.id);
      if (!blob) {
        console.error("Audio blob not found for recording:", rec.id);
        return;
      }

      const url = URL.createObjectURL(blob);
      blobUrlRef.current = url;
      audio.src = url;
      audio.playbackRate = rateRef.current;

      // WebM from MediaRecorder reports Infinity duration.
      // Use the stored durationSec from the metadata as the duration.
      // On load, set audio.currentTime = 1e101 once, then back to 0, so seeking works.
      isPreparingRef.current = true;
      try {
        await new Promise((resolve) => {
          let resolved = false;
          const finish = () => {
            if (resolved) return;
            resolved = true;
            audio.removeEventListener("seeked", onSeeked);
            try {
              audio.currentTime = 0;
            } catch {
              // Ignore
            }
            isPreparingRef.current = false;
            resolve();
          };

          const onSeeked = () => {
            finish();
          };

          audio.addEventListener("seeked", onSeeked, { once: true });
          try {
            audio.currentTime = 1e101;
          } catch {
            finish();
          }
          setTimeout(finish, 200);
        });
      } catch {
        isPreparingRef.current = false;
      }

      try {
        await audio.play();
        setIsPlaying(true);
        pushNative(0, true);
      } catch (err) {
        console.error("Recording audio play error:", err);
        setIsPlaying(false);
      }
    },
    [livePlayer, pushNative]
  );

  // Toggle play/pause
  const toggle = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !currentRecRef.current) return;

    if (isPlayingRef.current) {
      audio.pause();
      setIsPlaying(false);
      pushNative(audio.currentTime, false);
    } else {
      // Starting playback calls the live player's stop-or-pause first.
      if (livePlayer.isPlaying || livePlayer.current) {
        livePlayer.stop();
      }
      try {
        await audio.play();
        setIsPlaying(true);
        pushNative(audio.currentTime, true);
      } catch (err) {
        console.error("Recording audio toggle play error:", err);
      }
    }
  }, [livePlayer, pushNative]);

  // Starting a live station stops the recording player.
  useEffect(() => {
    const handleLivePlay = () => {
      if (currentRecRef.current) {
        stop();
      }
    };
    window.addEventListener("aether:live-play", handleLivePlay);
    return () => window.removeEventListener("aether:live-play", handleLivePlay);
  }, [stop]);

  useEffect(() => {
    if (livePlayer.isPlaying && currentRecRef.current) {
      stop();
    }
  }, [livePlayer.isPlaying, stop]);

  // Native media controls listener (seek, rewind, forward, play, pause, stop)
  useEffect(() => {
    const unbind = setupNativeMediaListener((action, data) => {
      if (!currentRecRef.current) return;

      if (action === "seek") {
        const posMs = data?.position;
        if (typeof posMs === "number") {
          seek(posMs / 1000);
        }
      } else if (action === "rewind") {
        skip(-15);
      } else if (action === "forward") {
        skip(15);
      } else if (action === "play") {
        if (!isPlayingRef.current) {
          toggle();
        }
      } else if (action === "pause") {
        if (isPlayingRef.current) {
          toggle();
        }
      } else if (action === "stop") {
        stop();
      }
    });

    return unbind;
  }, [seek, skip, toggle, stop]);

  // Browser MediaSession API sync (Desktop / Web browser)
  useEffect(() => {
    if (isNativePlatform()) return;
    if (!("mediaSession" in navigator)) return;

    if (!currentRec) {
      return;
    }

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentRec.name || "Recording",
      artist: currentRec.stationName || "Archived Broadcast",
      album: "Aether FM Recordings",
    });
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";

    try {
      navigator.mediaSession.setActionHandler("play", () => {
        if (!isPlayingRef.current) toggle();
      });
      navigator.mediaSession.setActionHandler("pause", () => {
        if (isPlayingRef.current) toggle();
      });
      navigator.mediaSession.setActionHandler("seekto", (details) => {
        if (typeof details.seekTime === "number") {
          seek(details.seekTime);
        }
      });
      navigator.mediaSession.setActionHandler("seekbackward", (details) => {
        skip(-(details.seekOffset || 15));
      });
      navigator.mediaSession.setActionHandler("seekforward", (details) => {
        skip(details.seekOffset || 15);
      });
      navigator.mediaSession.setActionHandler("stop", () => {
        stop();
      });
    } catch {
      // Browser might not support all action handlers
    }

    if ("setPositionState" in navigator.mediaSession && duration > 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration,
          playbackRate: rate,
          position: Math.min(position, duration),
        });
      } catch {
        // Ignore
      }
    }
  }, [currentRec, duration, isPlaying, position, rate, seek, skip, stop, toggle]);

  return (
    <RecordingPlayerContext.Provider
      value={{
        currentRec,
        isPlaying,
        position,
        duration,
        rate,
        play,
        toggle,
        seek,
        skip,
        setRate,
        stop,
      }}
    >
      {children}
    </RecordingPlayerContext.Provider>
  );
}
