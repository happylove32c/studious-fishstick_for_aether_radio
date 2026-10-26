import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { usePlayer } from "../context/usePlayer";
import { useStations } from "../context/useStations";

const TEXT_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

function isTypingTarget(t) {
  if (!t) return false;
  if (t.isContentEditable) return true;
  return TEXT_TAGS.has(t.tagName) && t.type !== "range";
}

export function usePresetShortcuts() {
  const { stations } = useStations();
  const { play, toggle, isCurrent, isFavorite } = usePlayer();
  const navigate = useNavigate();

  const ref = useRef({ stations, play, toggle, isCurrent, isFavorite, navigate });
  useEffect(() => {
    ref.current = { stations, play, toggle, isCurrent, isFavorite, navigate };
  }, [stations, play, toggle, isCurrent, isFavorite, navigate]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hasKeyboard =
      window.matchMedia &&
      window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!hasKeyboard) return;

    const onKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;

      const m = /^(?:Digit|Numpad)([1-6])$/.exec(e.code);
      if (!m) return;

      const { stations, play, toggle, isCurrent, isFavorite, navigate } =
        ref.current;

      if (!stations || stations.length === 0) return;

      // Presets = favourites, in the same order as the Favorites page
      const favorites = stations.filter((s) => isFavorite(s));
      const idx = Number(m[1]) - 1;
      const station = favorites[idx];
      if (!station) return;

      e.preventDefault();
      if (isCurrent(station)) {
        toggle();
      } else {
        play(station, favorites);
        navigate("/now-playing");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}

export default usePresetShortcuts;