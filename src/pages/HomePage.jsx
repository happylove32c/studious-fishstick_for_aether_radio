import GenreCard from "../components/GenreCard";
import Header from "../components/Header";
import { useStations } from "../context/useStations";
import { usePlayer } from "../context/usePlayer";

function HomePage() {
  const { stations, loading, error, reload } = useStations();
  const { current } = usePlayer();

  // Group genres case-insensitively (key = lowercase, display = first-seen casing)
  const genresMap = new Map();
  for (const station of stations) {
    const key = station.genre.toLowerCase();
    if (!genresMap.has(key)) {
      genresMap.set(key, { genre: station.genre, count: 0 });
    }
    genresMap.get(key).count += 1;
  }
  const genres = Array.from(genresMap.values());

  return (
    <div className="min-h-screen bg-cream font-jetbrains text-ink">
      <Header />

      <main className={`px-4 py-8 sm:px-6 md:px-10 md:py-12 ${current ? "pb-48 md:pb-36" : "pb-28 md:pb-16"}`}>
        <div className="mb-8 sm:mb-12">
          <p className="label font-bold uppercase text-ink-muted">
            Available frequencies
          </p>

          <h1 className="font-fredoka text-5xl font-bold uppercase leading-none tracking-tight text-ink sm:text-7xl md:text-8xl">
            Stations
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
                ? "Scanning frequencies…"
                : error
                ? `Error: ${error}`
                : `${genres.length} genres · ${stations.length} stations on air`}
            </p>
          )}
        </div>

        {/* 2-column mobile, 3-column desktop grid */}
        <div className="grid grid-cols-1 min-[340px]:grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="min-h-[160px] sm:aspect-square sm:min-h-0 flex flex-col justify-between rounded-card border-3 border-ink bg-panel p-3.5 sm:p-5 md:p-6 shadow-hard animate-pulse"
                >
                  <div className="flex items-start justify-between">
                    <div className="h-4 w-10 rounded-pill bg-panel-inset" />
                    <div className="h-3 w-3 rounded-full bg-panel-inset" />
                  </div>
                  <div>
                    <div className="mb-2 h-3 w-14 rounded-pill bg-panel-inset" />
                    <div className="h-6 sm:h-8 w-4/5 rounded-chunky bg-panel-inset mb-2.5" />
                    <div className="h-3.5 w-3/5 rounded-pill bg-panel-inset/60" />
                  </div>
                  <div className="flex items-center justify-between border-t-2 border-panel-inset pt-3">
                    <div className="h-3 w-16 rounded-pill bg-panel-inset" />
                    <div className="h-6 w-6 rounded-pill bg-panel-inset" />
                  </div>
                </div>
              ))
            : genres.map(({ genre, count }, i) => (
                <GenreCard
                  key={genre}
                  number={String(i + 1).padStart(3, "0")}
                  genre={genre}
                  description={`${count} ${count === 1 ? "station" : "stations"} — tap to tune in.`}
                />
              ))}
        </div>
      </main>
    </div>
  );
}

export default HomePage;