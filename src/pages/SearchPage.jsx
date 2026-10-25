import { useState, useMemo } from "react";
import GenreCard from "../components/GenreCard";
import { Search, X } from "lucide-react";
import Header from "../components/Header";
import BackLink from "../components/BackLink";
import StationCard from "../components/StationCard";
import SkeletonCard from "../components/SkeletonCard";
import ErrorBanner from "../components/ErrorBanner";
import { useStations } from "../context/useStations";
import { usePlayer } from "../context/usePlayer";

function filterStations(stations = [], query = "") {
  const q = (query || "").trim().toLowerCase();
  if (!q) return [];
  return (stations || []).filter((s) =>
    s?.name?.toLowerCase().includes(q)
  );
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const { stations, loading, error, reload } = useStations();
  const { current } = usePlayer();

  const trimmed = query.trim();
  const results = filterStations(stations, query);

  // Group genres case-insensitively for browsing when no query
  const genres = useMemo(() => {
    const map = new Map();
    for (const s of stations) {
      const key = s.genre?.toLowerCase() || "unknown";
      if (!map.has(key)) {
        map.set(key, { genre: s.genre, count: 0 });
      }
      map.get(key).count += 1;
    }
    return Array.from(map.values());
  }, [stations]);

  return (
    <div className="min-h-screen bg-cream font-jetbrains text-ink">
      <Header />
      <main
        className={`px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-8 sm:px-6 sm:py-8 md:px-10 md:py-12 ${
          current ? "pb-[15rem] md:pb-36" : "pb-[10rem] md:pb-16"
        }`}
      >
        <BackLink className="mb-6" />

        <p className="label font-bold uppercase text-ink-muted">
          Find a station
        </p>

        <h1 className="font-fredoka text-5xl font-bold uppercase leading-none tracking-tight text-ink sm:text-7xl md:text-8xl">
          Search
        </h1>

        {/* Search input container */}
        <div className="relative mt-6 max-w-xl">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
            <Search className="h-5 w-5 text-ink-muted" strokeWidth={2.5} />
          </div>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Station name…"
            className="w-full rounded-pill border-3 border-ink bg-panel py-3 pl-12 pr-12 font-mono text-sm font-bold text-ink placeholder:font-mono placeholder:font-medium placeholder:text-ink-muted/60 shadow-hard-sm transition-transform duration-tactile ease-spring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-cream [&::-webkit-search-cancel-button]:hidden"
          />
          {query.length > 0 && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute inset-y-0 right-0 flex items-center pr-4 text-ink hover:text-status-red transition-colors focus-visible:outline-none"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-ink bg-cream text-ink shadow-hard-sm hover:bg-status-red hover:text-cream transition-colors">
                <X className="h-3.5 w-3.5" strokeWidth={3} />
              </div>
            </button>
          )}
        </div>

        {error && stations.length === 0 && (
          <ErrorBanner message={error} onRetry={reload} />
        )}

        {/* State: Loading */}
        {loading && (
          <div className="mt-8 sm:mt-12 grid grid-cols-1 min-[340px]:grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* State: Empty Query – Browse Genres */}
        {!loading && trimmed === "" && genres.length > 0 && (
          <section className="mt-8">
            <h2 className="font-fredoka text-2xl font-bold uppercase tracking-tight text-ink sm:text-3xl mb-4">
              Browse genres
            </h2>
            <div className="grid grid-cols-1 min-[340px]:grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
              {genres.map(({ genre, count }, i) => (
                <GenreCard
                  key={genre}
                  number={String(i + 1).padStart(3, "0")}
                  genre={genre}
                  description={`${count} ${count === 1 ? "frequency" : "frequencies"} — tune in.`}
                />
              ))}
            </div>
          </section>
        )}

        {/* State: No Matches Cartoon Empty State */}
        {!loading && trimmed !== "" && results.length === 0 && (
          <div className="mx-auto mt-8 max-w-md rounded-panel border-3 border-ink bg-panel p-8 text-center shadow-hard sm:mt-14 sm:p-12">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-panel border-3 border-ink bg-[#FFD166] text-ink shadow-hard">
              <Search className="h-10 w-10 text-ink" strokeWidth={2.5} />
            </div>
            <h2 className="font-fredoka text-2xl font-bold uppercase text-ink sm:text-3xl">
              No stations found
            </h2>
            <p className="mt-2 font-mono text-xs font-medium text-ink-muted sm:text-sm">
              No broadcast matches &ldquo;{trimmed}&rdquo;. Try another name.
            </p>
            <button
              type="button"
              onClick={() => setQuery("")}
              className="mt-6 inline-flex items-center justify-center rounded-pill border-3 border-ink bg-[#FF6B6B] px-6 py-3 font-fredoka text-sm font-bold uppercase tracking-wider text-ink shadow-hard transition-transform duration-tactile ease-spring hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink focus-visible:ring-offset-2"
            >
              Clear search
            </button>
          </div>
        )}

        {/* State: Results Found */}
        {!loading && trimmed !== "" && results.length > 0 && (
          <>
            <p className="mt-6 font-mono text-xs font-bold uppercase tracking-wider text-ink-muted sm:text-sm">
              {results.length} {results.length === 1 ? "station" : "stations"} found
            </p>
            <div className="mt-8 sm:mt-12 grid grid-cols-1 min-[340px]:grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
              {results.map((s, i) => (
                <StationCard
                  key={s._id || i}
                  number={String(i + 1).padStart(3, "0")}
                  station={s}
                  playlist={results}
                  genre={s.genre}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
