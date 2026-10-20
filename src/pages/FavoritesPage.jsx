import { Heart } from "lucide-react";
import { Link } from "react-router-dom";
import BackLink from "../components/BackLink";
import Header from "../components/Header";
import StationCard from "../components/StationCard";
import { useStations } from "../context/useStations";
import { usePlayer } from "../context/usePlayer";

export default function FavoritesPage() {
  const { stations, loading, error, reload } = useStations();
  const { current, isFavorite } = usePlayer();

  const favoriteStations = stations.filter((s) => isFavorite(s));

  return (
    <div className="min-h-screen bg-cream font-jetbrains text-ink">
      <Header />
      <main
        className={`px-4 py-8 sm:px-6 md:px-10 md:py-12 ${
          current ? "pb-48 md:pb-36" : "pb-28 md:pb-16"
        }`}
      >
        <BackLink className="mb-6" />

        <p className="label font-bold uppercase text-ink-muted">
          Preset Stations
        </p>

        <h1 className="font-fredoka text-5xl font-bold uppercase leading-none tracking-tight text-ink sm:text-7xl md:text-8xl">
          Favorites
        </h1>

        {error && stations.length === 0 ? (
          <div className="mt-4 flex max-w-md items-center justify-between gap-3 rounded-chunky border-2 border-status-red-text bg-[#FEE2E2] p-3 text-status-red-text shadow-hard-sm">
            <span className="font-mono text-xs font-bold uppercase tracking-wider">
              Error: {error}
            </span>
            <button
              onClick={reload}
              className="shrink-0 rounded-pill border-2 border-status-red-text bg-cream px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider shadow-hard-sm hover:bg-status-red hover:text-cream transition-colors"
            >
              Retry
            </button>
          </div>
        ) : (
          <p className="mt-3 font-mono text-xs font-bold uppercase tracking-wider text-ink-muted sm:text-sm">
            {loading
              ? "Scanning presets…"
              : error
              ? `Error: ${error}`
              : `${favoriteStations.length} ${
                  favoriteStations.length === 1 ? "station" : "stations"
                } saved`}
          </p>
        )}

        {/* Empty state with cartoon personality */}
        {!loading && favoriteStations.length === 0 && (
          <div className="mx-auto mt-8 max-w-md rounded-panel border-3 border-ink bg-panel p-8 text-center shadow-hard sm:mt-14 sm:p-12">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-panel border-3 border-ink bg-[#FFD166] text-ink shadow-hard">
              <Heart className="h-10 w-10 text-ink fill-current" strokeWidth={2.5} />
            </div>
            <h2 className="font-fredoka text-2xl font-bold uppercase text-ink sm:text-3xl">
              No presets saved
            </h2>
            <p className="mt-2 font-mono text-xs font-medium text-ink-muted sm:text-sm">
              Tap the heart sticker on any station to pin it to your quick-dial favorites.
            </p>
            <Link
              to="/"
              className="mt-6 inline-flex items-center justify-center rounded-pill border-3 border-ink bg-[#FF6B6B] px-6 py-3 font-fredoka text-sm font-bold uppercase tracking-wider text-ink shadow-hard transition-transform duration-tactile ease-spring hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink focus-visible:ring-offset-2"
            >
              Browse stations
            </Link>
          </div>
        )}

        {/* Saved stations grid */}
        {!loading && favoriteStations.length > 0 && (
          <div className="mt-8 sm:mt-12 grid grid-cols-1 min-[340px]:grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
            {favoriteStations.map((s, i) => (
              <StationCard
                key={s._id || i}
                number={String(i + 1).padStart(3, "0")}
                station={s}
                playlist={favoriteStations}
                genre={s.genre}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}