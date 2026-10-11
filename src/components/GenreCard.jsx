import { ArrowRight, AudioLines } from "lucide-react";
import { Link } from "react-router-dom";
import { usePlayer } from "../context/usePlayer";
import { getGenreColor, readableOn } from "../utils/genreColors";

function GenreCard({ number, genre, description }) {
  const { current, isPlaying, status } = usePlayer();
  const isCurrentGenre =
    Boolean(current?.genre) &&
    current.genre.toLowerCase() === genre?.toLowerCase();
  const live = isCurrentGenre && isPlaying && status === "connected";

  const color = getGenreColor(genre);
  const ink = readableOn(color);

  // --g: genre colour, --gb: same colour at 60% for the resting border,
  // --gt: text colour that stays readable on the filled (hover) background.
  return (
    <Link
      to={`/genre/${encodeURIComponent(genre)}`}
      style={{ "--g": color, "--gb": `${color}99`, "--gt": ink }}
      className={`group relative flex aspect-square flex-col justify-between overflow-hidden border border-[color:var(--gb)] p-3 text-white transition-colors duration-300 hover:border-[color:var(--g)] hover:bg-[color:var(--g)] hover:text-[color:var(--gt)] sm:p-5 md:p-6 ${
        live
          ? "bg-white/[0.08] shadow-[inset_0_0_0_1px_var(--g)]"
          : isCurrentGenre
          ? "bg-white/[0.07]"
          : "bg-white/[0.03]"
      }`}
    >
      <div className="flex items-start justify-between">
        <span className="text-[10px] tracking-[0.25em] opacity-60 sm:tracking-[0.3em]">
          {number}
        </span>

        {live ? (
          <AudioLines className="h-3.5 w-3.5 animate-pulse sm:h-4 sm:w-4" />
        ) : (
          <span className="h-2 w-2 bg-[color:var(--g)] transition-colors duration-300 group-hover:bg-current" />
        )}
      </div>

      <div className="my-auto py-1">
        <p className="mb-1 text-[9px] uppercase tracking-[0.3em] opacity-60 sm:mb-2 sm:text-[10px] sm:tracking-[0.35em]">
          Genre
        </p>

        <h2 className="line-clamp-2 break-words text-base font-black uppercase leading-tight tracking-[-0.03em] sm:text-2xl sm:leading-7 md:text-3xl md:leading-8">
          {genre}
        </h2>

        <p className="mt-1.5 line-clamp-2 max-w-xs text-[10px] leading-4 opacity-70 sm:mt-2.5 sm:text-[11px] sm:leading-4 md:text-xs md:leading-5">
          {description}
        </p>
      </div>

      <div className="flex flex-col gap-2.5 sm:gap-3.5">
        <div className="h-px bg-current opacity-20" />

        <div className="flex items-center justify-between">
          <span
            className={`text-[9px] uppercase tracking-[0.2em] sm:text-[10px] sm:tracking-[0.25em] ${
              live ? "font-bold" : "opacity-60"
            }`}
          >
            {live ? "On Air" : "Explore"}
          </span>

          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1 sm:h-4 sm:w-4" />
        </div>
      </div>
    </Link>
  );
}

export default GenreCard;