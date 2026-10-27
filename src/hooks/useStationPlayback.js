import { useNavigate } from "react-router-dom";
import { usePlayer } from "../context/usePlayer";

/**
 * Encapsulates playback and favorite operations for a single station card/row.
 *
 * @param {Object} station - The target station object.
 * @param {Array} [list] - Optional playlist to use when playing this station.
 * @returns {{
 *   isCurrent: boolean,
 *   live: boolean,
 *   fav: boolean,
 *   play: (targetStation?: Object, targetList?: Array) => void,
 *   toggle: () => void,
 *   toggleFavorite: (targetStation?: Object) => void,
 *   handleCardClick: () => void,
 *   handleClick: () => void,
 *   handleQuickPlay: (e?: Event) => void,
 *   handlePlayToggle: (e?: Event) => void,
 *   handleFav: (e?: Event) => void,
 * }}
 */
export function useStationPlayback(station, list) {
  const {
    play,
    toggle,
    isCurrent: checkIsCurrent,
    status,
    isPlaying,
    isFavorite,
    toggleFavorite,
  } = usePlayer();
  const navigate = useNavigate();

  const playlist = list || (station ? [station] : []);
  const isCurrent = Boolean(station && checkIsCurrent(station));
  const live = isCurrent && isPlaying && status === "connected";
  const fav = Boolean(station && isFavorite(station));

  const handleCardClick = () => {
    if (!isCurrent || status === "error") {
      if (station) {
        play(station, playlist);
      }
    }
    navigate("/now-playing");
  };

  const handleQuickPlay = (e) => {
    e?.stopPropagation?.();
    if (isCurrent) {
      toggle();
    } else if (station) {
      play(station, playlist);
    }
  };

  const handleFav = (e) => {
    e?.stopPropagation?.();
    if (station) {
      toggleFavorite(station);
    }
  };

  const handlePlay = (targetStation = station, targetList = playlist) => {
    const s = targetStation || station;
    if (s) {
      play(s, targetList || playlist);
    }
  };

  const handleToggleFav = (targetStation = station) => {
    const s = targetStation || station;
    if (s) {
      toggleFavorite(s);
    }
  };

  return {
    isCurrent,
    live,
    fav,
    play: handlePlay,
    toggle,
    toggleFavorite: handleToggleFav,
    handleCardClick,
    handleClick: handleCardClick,
    handleQuickPlay,
    handlePlayToggle: handleQuickPlay,
    handleFav,
  };
}

export default useStationPlayback;
