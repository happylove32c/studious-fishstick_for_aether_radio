import { useCallback, useEffect, useState } from "react";

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
    /* quota / private-mode - ignore */
  }
}

function stationKey(station) {
  return station?._id || station?.streamUrl || "";
}

/**
 * Hook to manage persisted favorites list and toggle favorites.
 *
 * @returns {{
 *   favorites: string[],
 *   isFavorite: (station: Object) => boolean,
 *   toggleFavorite: (station: Object) => void
 * }}
 */
export function useFavorites() {
  const [favorites, setFavorites] = useState(loadFavorites);

  // Persist favorites
  useEffect(() => {
    saveFavorites(favorites);
  }, [favorites]);

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

  return {
    favorites,
    isFavorite,
    toggleFavorite,
  };
}

export default useFavorites;
