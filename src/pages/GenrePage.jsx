import { Link, useParams } from "react-router-dom";
import Header from "../components/Header";
import StationCard from "../components/StationCard";
import { useStations } from "../context/useStations";
import { usePlayer } from "../context/usePlayer";
import { getGenreColor } from "../utils/genreColors";

export default function GenrePage() {
  const { genre } = useParams();
  const { stations, loading, error } = useStations();
  const { current } = usePlayer();

  const color = getGenreColor(genre);

  const filtered = stations.filter(
    (s) => (s.genre?.trim() || "Unknown") === genre
  );

  return (
    <div className="min-h-screen bg-black font-jetbrains">
      <Header />
      <section className={`px-4 py-10 sm:px-6 md:px-10 md:py-16 ${current ? "pb-24 md:pb-24" : ""}`}>
        <Link
          to="/"
          className="mb-8 inline-block text-[11px] uppercase tracking-[0.35em] text-white/60 hover:text-white"
        >
          ← Back
        </Link>

        <p className="mb-3 text-[10px] uppercase tracking-[0.4em] text-white/50">
          Frequency
        </p>

        <h1
          className="text-5xl font-black uppercase leading-none tracking-[-0.06em] md:text-8xl"
          style={{ color }}
        >
          {genre}
        </h1>

        <p className="mt-4 text-[11px] uppercase tracking-[0.35em] text-white/60">
          {loading
            ? "Scanning stations…"
            : error
            ? `Error: ${error}`
            : `${filtered.length} ${filtered.length === 1 ? "station" : "stations"} on air`}
        </p>

        <div className="mt-12 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square flex flex-col justify-between border border-white/10 bg-white/[0.02] p-3 sm:p-6 animate-pulse"
                >
                  <div className="flex items-start justify-between">
                    <div className="h-3 w-8 bg-white/10" />
                    <div className="h-7 w-7 bg-white/10" />
                  </div>
                  <div>
                    <div className="mb-2 h-2.5 w-16 bg-white/10" />
                    <div className="h-6 sm:h-9 w-4/5 bg-white/10 mb-3" />
                    <div className="hidden sm:block h-3 w-24 bg-white/5" />
                  </div>
                  <div className="flex items-center justify-between border-t border-white/10 pt-3 sm:pt-4">
                    <div className="h-2.5 w-16 bg-white/10" />
                    <div className="h-3 w-3 bg-white/10" />
                  </div>
                </div>
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
      </section>
    </div>
  );
}