import { useParams } from "react-router-dom";
import BackLink from "../components/BackLink";
import Header from "../components/Header";
import StationCard from "../components/StationCard";
import SkeletonCard from "../components/SkeletonCard";
import ErrorBanner from "../components/ErrorBanner";
import { useStations } from "../context/useStations";
import { usePlayer } from "../context/usePlayer";
import { getGenreColor } from "../utils/genreColors";

export default function GenrePage() {
  const { genre } = useParams();
  const { stations, loading, error, reload } = useStations();
  const { current } = usePlayer();

  const color = getGenreColor(genre);

  const filtered = stations.filter(
    (s) => s.genre.toLowerCase() === genre?.toLowerCase()
  );

  return (
    <div className="min-h-screen bg-cream font-jetbrains text-ink">
      <Header />
      <main className={`px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-8 sm:px-6 sm:py-8 md:px-10 md:py-12 ${current ? "pb-[15rem] md:pb-36" : "pb-[10rem] md:pb-16"}`}>
        <BackLink className="mb-6" />

        <p className="label font-bold uppercase text-ink-muted">
          Frequency Genre
        </p>

        <div className="mt-1 flex items-baseline gap-3">
          <h1
            className="font-fredoka text-5xl font-bold uppercase leading-none tracking-tight sm:text-7xl md:text-8xl"
            style={{ color: "#1B1A17" }}
          >
            {genre}
          </h1>
          <span
            className="h-4 w-4 sm:h-6 sm:w-6 rounded-full border-2 border-ink shadow-hard-sm"
            style={{ backgroundColor: color }}
            aria-hidden="true"
          />
        </div>

        {error && stations.length === 0 ? (
          <ErrorBanner message={error} onRetry={reload} />
        ) : (
          <p className="mt-3 font-mono text-xs font-bold uppercase tracking-wider text-ink-muted sm:text-sm">
            {loading
              ? "Scanning stations…"
              : error
              ? `Error: ${error}`
              : `${filtered.length} ${filtered.length === 1 ? "station" : "stations"} on air`}
          </p>
        )}

        <div className="mt-8 sm:mt-12 grid grid-cols-1 min-[340px]:grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} withHeart />
              ))
            : filtered.map((s, i) => (
                <StationCard
                  key={s._id || i}
                  number={String(i + 1).padStart(3, "0")}
                  station={s}
                  playlist={filtered}
                  genre={genre}
                />
              ))}
        </div>
      </main>
    </div>
  );
}