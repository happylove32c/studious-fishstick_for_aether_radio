import { ArrowRight, AudioLines } from "lucide-react";
import { Link } from "react-router-dom";
import { usePlayer } from "../context/usePlayer";

function GenreCard({ number, genre, description }) {
  const { current, isPlaying, status } = usePlayer();
  const isCurrentGenre =
    Boolean(current?.genre) &&
    current.genre.trim().toLowerCase() === (genre?.trim().toLowerCase() || "");
  const live = isCurrentGenre && isPlaying && status === "connected";

  return (
    <Link
      to={`/genre/${encodeURIComponent(genre)}`}
      className={`group relative flex aspect-square flex-col justify-between overflow-hidden border p-3 transition-all duration-300 sm:p-5 md:p-6 ${
        live
          ? "border-green-500/50 bg-green-500/[0.05] hover:border-green-400 hover:bg-green-500/[0.08]"
          : isCurrentGenre
          ? "border-white/40 bg-white/[0.07] hover:border-white/60 hover:bg-white/[0.1]"
          : "border-white/15 bg-white/[0.04] hover:border-white/40 hover:bg-white/[0.07]"
      }`}
    >
      <div className="flex items-start justify-between">
        <span className="text-[9px] tracking-[0.25em] text-white/30 sm:text-[10px] sm:tracking-[0.3em]">
          {number}
        </span>

        {live ? (
          <div className="flex items-center gap-1 text-green-400">
            <AudioLines className="h-3 w-3 animate-pulse sm:h-4 sm:w-4" />
          </div>
        ) : isCurrentGenre ? (
          <span className="h-1.5 w-1.5 bg-white/60 sm:h-2 sm:w-2" />
        ) : (
          <span className="h-1.5 w-1.5 bg-white sm:h-2 sm:w-2" />
        )}
      </div>

      <div className="my-auto py-1">
        <p className="mb-1 text-[8px] uppercase tracking-[0.3em] text-white/30 sm:mb-2 sm:text-[10px] sm:tracking-[0.35em]">
          Genre
        </p>

        <h2 className="line-clamp-2 break-words text-base font-black uppercase leading-tight tracking-[-0.03em] text-white sm:text-2xl sm:leading-7 md:text-3xl md:leading-8">
          {genre}
        </h2>

        <p className="mt-1.5 line-clamp-2 max-w-xs text-[9px] leading-3.5 text-white/40 sm:mt-2.5 sm:text-[11px] sm:leading-4 md:text-xs md:leading-5">
          {description}
        </p>
      </div>

      <div className="flex items-center justify-between border-t border-white/10 pt-2.5 sm:pt-3.5">
        <span
          className={`text-[8px] uppercase tracking-[0.2em] sm:text-[9px] sm:tracking-[0.25em] ${
            live ? "font-bold text-green-400" : "text-white/30"
          }`}
        >
          {live ? "On Air" : "Explore"}
        </span>

        <span className="text-white">
          <ArrowRight className="h-3.5 w-3.5 text-white transition-transform duration-300 group-hover:translate-x-1 sm:h-4 sm:w-4" />
        </span>
      </div>
    </Link>
  );
}

export default GenreCard;