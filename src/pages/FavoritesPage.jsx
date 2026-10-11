import { Link } from "react-router-dom";
import Header from "../components/Header";
import StationCard from "../components/StationCard";
import { useStations } from "../context/useStations";
import { usePlayer } from "../context/usePlayer";

export default function FavoritesPage() {
  const { stations, loading, error, reload } = useStations();
  const { current, isFavorite } = usePlayer();

  const favoriteStations = stations.filter((s) => isFavorite(s));

  return (
    <div className="min-h-screen bg-black font-jetbrains">
      <Header />
      <section
        className={`px-4 py-10 sm:px-6 md:px-10 md:py-16 ${
          current ? "pb-24 md:pb-24" : ""
        }`}
      >
        <Link
          to="/"
          className="mb-8 inline-block text-[11px] uppercase tracking-[0.35em] text-white/60 hover:text-white"
        >
          ← Back
        </Link>

        <p className="mb-3 text-[10px] uppercase tracking-[0.4em] text-white/50">
          Presets
        </p>

        <h1 className="text-5xl font-black uppercase leading-none tracking-[-0.06em] text-white md:text-8xl">
          Favorites
        </h1>

        {error && stations.length === 0 ? (
          <div className="mt-4 flex items-center gap-3">
            <span className="text-[11px] uppercase tracking-[0.35em] text-red-400">
              Error: {error}
            </span>
            <button
              onClick={reload}
              className="shrink-0 border border-red-500/50 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-red-400 transition-colors hover:bg-red-500/20"
            >
              Retry
            </button>
          </div>
        ) : (
          <p className="mt-4 text-[11px] uppercase tracking-[0.35em] text-white/60">
            {loading
              ? "Scanning presets…"
              : error
              ? `Error: ${error}`
              : `${favoriteStations.length} ${
                  favoriteStations.length === 1 ? "station" : "stations"
                } saved`}
          </p>
        )}

        {!loading && favoriteStations.length === 0 && (
          <div className="mt-12 border border-white/10 bg-white/[0.03] p-8 text-center">
            <p className="text-[11px] uppercase tracking-[0.3em] text-white/50">
              No presets saved yet
            </p>
            <Link
              to="/"
              className="mt-6 inline-block border border-white/20 px-6 py-3 text-[11px] font-bold uppercase tracking-[0.25em] text-white hover:bg-white hover:text-black transition-colors"
            >
              Browse stations
            </Link>
          </div>
        )}

        {!loading && favoriteStations.length > 0 && (
          <div className="mt-12 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {favoriteStations.map((s, i) => {
              // Build the playlist per-station from the whole favorites list,
              // so prev/next on the player cycles through favorites.
              const genre = s.genre?.trim() || "Unknown";
              return (
                <StationCard
                  key={s._id || i}
                  number={String(i + 1).padStart(3, "0")}
                  station={s}
                  playlist={favoriteStations.map((fs) => ({
                    ...fs,
                    genre: fs.genre?.trim() || "Unknown",
                  }))}
                  genre={genre}
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}