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

  return (
    <Link
      to={`/genre/${encodeURIComponent(genre)}`}
      style={{ "--g": color, "--gb": `${color}99`, "--gt": ink }}
      className={`group relative flex min-h-[160px] flex-col justify-between rounded-card border-3 border-ink bg-[color:var(--g)] p-3.5 text-[color:var(--gt)] shadow-hard transition-transform duration-tactile ease-spring hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-cream sm:aspect-square sm:min-h-0 sm:p-5 md:p-6`}
    >
      {/* Top Header: Station number and Live sticker badge */}
      <div className="flex items-start justify-between gap-2">
        <span className="whitespace-nowrap rounded-pill border-2 border-ink bg-panel/30 px-2.5 py-0.5 font-mono text-[11px] font-bold tracking-widest sm:text-xs">
          {number}
        </span>

        {live ? (
          <>
            {/* Mobile: icon-only round sticker */}
            <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-ink bg-panel shadow-hard-sm sm:hidden">
              <AudioLines className="h-3.5 w-3.5 text-status-green-text" strokeWidth={2.5} />
              <span className="sr-only">On air</span>
            </div>
            {/* Desktop: full pill */}
            <div className="hidden whitespace-nowrap items-center gap-1.5 rounded-pill border-2 border-ink bg-panel px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-ink shadow-hard-sm sm:flex sm:text-xs">
              <AudioLines className="h-3.5 w-3.5 text-status-green-text" strokeWidth={2.5} />
              <span>ON AIR</span>
            </div>
          </>
        ) : (
          <span className="h-3 w-3 rounded-full border-2 border-ink bg-current opacity-30 group-hover:opacity-100 transition-opacity" />
        )}
      </div>

      {/* Main Genre Typography */}
      <div className="my-auto min-w-0 py-1">
        <p className="label font-bold uppercase text-[color:var(--gt)]">
          Genre
        </p>

        <h2 className="line-clamp-2 break-words font-fredoka text-lg font-bold uppercase leading-tight sm:text-2xl md:text-3xl">
          {genre}
        </h2>

        <p className="mt-1.5 line-clamp-2 break-words text-xs font-medium leading-snug sm:text-sm">
          {description}
        </p>
      </div>

      {/* Card Footer */}
      <div className="flex flex-col gap-2">
        <div className="h-0.5 w-full bg-ink/20 rounded-full" />

        <div className="flex items-center justify-between">
          <span className="whitespace-nowrap font-mono text-[11px] font-bold uppercase tracking-wider sm:text-xs">
            {live ? "Now Playing" : "Explore"}
          </span>

          <div className="flex h-7 w-7 items-center justify-center rounded-pill border-2 border-ink bg-panel/20 transition-transform duration-tactile ease-spring group-hover:translate-x-1 sm:h-8 sm:w-8">
            <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
          </div>
        </div>
      </div>
    </Link>
  );
}

export default GenreCard;