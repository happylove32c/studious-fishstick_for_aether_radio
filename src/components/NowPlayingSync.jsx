import { useEffect, useRef } from "react";
import { usePlayer } from "../context/usePlayer";
import { useNowPlayingTrack } from "../hooks/useNowPlayingTrack";
import * as sleepTimer from "../utils/sleepTimer";

export default function NowPlayingSync() {
  const { current, isPlaying, status, toggle, setVolume, volume } = usePlayer();

  const ref = useRef({ isPlaying, toggle, setVolume, volume });

  useEffect(() => {
    ref.current = { isPlaying, toggle, setVolume, volume };
  }, [isPlaying, toggle, setVolume, volume]);

  useNowPlayingTrack(current, isPlaying && status === "connected", {
    syncMetadata: true,
  });

  useEffect(() => {
    sleepTimer.bind({
      pause: () => {
        if (ref.current.isPlaying) ref.current.toggle();
      },
      setVolume: (v) => ref.current.setVolume(v),
      getVolume: () => ref.current.volume,
    });
  }, []);

  return null;
}