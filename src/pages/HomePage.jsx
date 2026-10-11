import GenreCard from "../components/GenreCard";
import Header from "../components/Header";
import { useStations } from "../context/useStations";
import { usePlayer } from "../context/usePlayer";

function HomePage() {
  const { stations, loading, error, reload } = useStations();
  const { current } = usePlayer();

  // Group stations by genre
  const genres = Object.entries(
    stations.reduce((acc, station) => {
      const key = station.genre?.trim() || "Unknown";
      if (!acc[key]) acc[key] = [];
      acc[key].push(station);
      return acc;
    }, {})
  ).map(([genre, list]) => ({ genre, count: list.length }));

  return (
    <div className="min-h-screen bg-black font-jetbrains">
      <Header />

      <section className={`px-4 py-10 sm:px-6 md:px-10 md:py-16 ${current ? "pb-24 md:pb-24" : ""}`}>
        <div className="mb-12">
          <p className="mb-3 text-[10px] uppercase tracking-[0.4em] text-white/30">
            Available frequencies
          </p>

          <h1 className="text-5xl font-black uppercase leading-none tracking-[-0.06em] text-white md:text-8xl">
            Stations
          </h1>

          {error && stations.length === 0 ? (
            <div className="mt-4 flex items-center gap-3">
              <span className="text-[10px] uppercase tracking-[0.35em] text-red-400">
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
            <p className="mt-4 text-[10px] uppercase tracking-[0.35em] text-white/40">
              {loading
                ? "Scanning frequencies…"
                : error
                ? `Error: ${error}`
                : `${genres.length} genres · ${stations.length} stations on air`}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square flex flex-col justify-between border border-white/10 bg-white/[0.02] p-3 sm:p-6 animate-pulse"
                >
                  <div className="flex items-start justify-between">
                    <div className="h-3 w-8 bg-white/10" />
                    <div className="h-2 w-2 bg-white/20" />
                  </div>
                  <div>
                    <div className="mb-2 h-2.5 w-12 bg-white/10" />
                    <div className="h-6 sm:h-9 w-3/4 bg-white/10 mb-3" />
                    <div className="h-3 w-1/2 bg-white/5" />
                  </div>
                  <div className="flex items-center justify-between border-t border-white/10 pt-3 sm:pt-4">
                    <div className="h-2.5 w-14 bg-white/10" />
                    <div className="h-4 w-4 bg-white/10" />
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
      </section>
    </div>
  );
}

export default HomePage;