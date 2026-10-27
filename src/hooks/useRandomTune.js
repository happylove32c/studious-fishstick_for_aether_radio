import { useCallback } from "react";
import { useStations } from "../context/useStations";
import { usePlayer } from "../context/usePlayer";

/**
 * Hook providing a function to pick and play a random station from available stations.
 *
 * @returns {() => void} Function that tunes into a random station.
 */
export function useRandomTune() {
  const { stations } = useStations();
  const { play } = usePlayer();

  const tuneRandom = useCallback(
    (customStations) => {
      const list = Array.isArray(customStations) && customStations.length > 0
        ? customStations
        : stations;
      if (!list || list.length === 0) return;
      const rand = list[Math.floor(Math.random() * list.length)];
      play(rand, list);
    },
    [stations, play]
  );

  return tuneRandom;
}

export default useRandomTune;
