import { useEffect, useRef } from "react";
import { usePlayer } from "../context/usePlayer";
import * as sleepTimer from "../utils/sleepTimer";

export default function NowPlayingSync() {
  const { isPlaying, toggle, setVolume, volume } = usePlayer();

  const ref = useRef({ isPlaying, toggle, setVolume, volume });

  useEffect(() => {
    ref.current = { isPlaying, toggle, setVolume, volume };
  }, [isPlaying, toggle, setVolume, volume]);

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
