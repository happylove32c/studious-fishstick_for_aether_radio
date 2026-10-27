import { useEffect, useRef } from "react";
import { usePlayer } from "../context/usePlayer";
import { useNowPlayingTrack } from "./useNowPlayingTrack";
import {
  isNativePlatform,
  requestNotificationPermission,
  setupNativeMediaListener,
  updateNativeMetadata,
  updateNativePlaybackState,
} from "../utils/nativeMediaControls";

/**
 * Owns all native (Capacitor notification / lock screen) and browser
 * MediaSession metadata, playback-state, action-handler and listener syncing
 * for the live station player.
 *
 * Must be rendered inside PlayerProvider. Call once from App.jsx.
 */
export function useNativeMediaSync() {
  const {
    current,
    isPlaying,
    status,
    toggle,
    stop,
    next,
    prev,
    playlist,
    stopRecording,
  } = usePlayer();

  // Live track info from the now-playing poller (polling lives in useNowPlayingTrack)
  const track = useNowPlayingTrack(current, isPlaying && status === "connected");

  // Latest handlers, read by MediaSession action handlers and native listener
  const handlersRef = useRef({});
  const stopRecordingRef = useRef(stopRecording);
  const canSkip = playlist.length > 1;

  useEffect(() => {
    stopRecordingRef.current = stopRecording;
  }, [stopRecording]);

  useEffect(() => {
    handlersRef.current = {
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

  // MediaSession action handlers (web / desktop only)
  useEffect(() => {
    if (isNativePlatform()) return;
    if (!("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    const live = ["play", "pause", "stop"];
    const skip = ["previoustrack", "nexttrack"];
    for (const a of [...live, ...skip]) {
      const on = live.includes(a) || canSkip;
      try {
        ms.setActionHandler(a, on ? () => handlersRef.current[a]?.() : null);
      } catch {
        /* unsupported */
      }
    }
  }, [canSkip]);

  // MediaSession metadata & playback state (web / desktop only)
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

  // Native notification metadata & playback state
  useEffect(() => {
    if (current) {
      updateNativeMetadata({
        title: current.name,
        artist: current.genre || "Live radio",
      });
    }
  }, [current]);

  useEffect(() => {
    if (current) {
      updateNativePlaybackState({ isPlaying });
    }
  }, [current, isPlaying]);

  // Live track title/artist -> native notification & MediaSession
  useEffect(() => {
    if (!current) return;

    const title = track.title || current.name || "Aether FM";
    const artist = track.artist || current.genre || "Live Radio";

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
  }, [current, track.title, track.artist]);

  // Restore station defaults on station change or unmount
  const stationMetaRef = useRef(null);
  useEffect(() => {
    if (!current) return;
    stationMetaRef.current = {
      name: current.name,
      genre: current.genre || "Live Radio",
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
  }, [current]);

  // Actions from lock screen & notification panel
  useEffect(() => {
    requestNotificationPermission();

    const unbind = setupNativeMediaListener((action) => {
      if (action === "stoprec") {
        stopRecordingRef.current?.();
        return;
      }
      const handler = handlersRef.current[action];
      if (handler) {
        handler();
      } else if (action === "next") {
        handlersRef.current.nexttrack?.();
      } else if (action === "previous") {
        handlersRef.current.previoustrack?.();
      }
    });

    return unbind;
  }, []);
}

export default useNativeMediaSync;
