import { AudioLines, Play, Pause, Heart } from "lucide-react";
import { useStationPlayback } from "../hooks/useStationPlayback";
import { getGenreColor, readableOn } from "../utils/genreColors";
import { getFrequency } from "../utils/frequency";

export default function StationQuickCard({ station, playlist }) {
  const {
    isCurrent,
    live,
    fav,
    handleCardClick,
    handleQuickPlay: handlePlayToggle,
    handleFav,
  } = useStationPlayback(station, playlist);

  const color = getGenreColor(station.genre);
  const ink = readableOn(color);
  const freq = getFrequency(station).toFixed(1);

  return (
    <div
      onClick={handleCardClick}
      className={`group relative flex cursor-pointer items-center justify-between overflow-hidden rounded-chunky border-2 border-ink bg-panel p-2 shadow-hard-sm transition-all duration-tactile ease-spring hover:-translate-y-0.5 hover:shadow-hard active:translate-y-0 active:shadow-hard-sm sm:p-2.5 ${
        isCurrent ? "ring-2 ring-ink bg-cream" : ""
      }`}
    >
      {/* Left side: Accent color block & info */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {/* Genre color tile with frequency */}
        <div
          style={{ backgroundColor: color, color: ink }}
          className="relative flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-chunky border-2 border-ink text-center shadow-[1px_1px_0px_#1B1A17] sm:h-14 sm:w-14"
        >
          {live ? (
            <AudioLines className="h-5 w-5" strokeWidth={2.5} />
          ) : (
            <>
              <span className="font-mono text-[9px] font-black uppercase tracking-tight opacity-75">
                FM
              </span>
              <span className="font-fredoka text-xs font-bold leading-none sm:text-sm">
                {freq}
              </span>
            </>
          )}
        </div>

        {/* Station text info */}
        <div className="min-w-0 flex-1 pr-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-fredoka text-sm font-bold uppercase leading-snug text-ink sm:text-base">
              {station.name}
            </span>
            {live && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-pill border border-ink bg-status-green px-1.5 py-0.2 font-mono text-[9px] font-black uppercase text-cream">
                <AudioLines className="h-2.5 w-2.5" />
                Live
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              style={{ backgroundColor: `${color}40`, color: "#1B1A17" }}
              className="inline-block rounded-pill border border-ink/40 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider"
            >
              {station.genre}
            </span>
            <span className="hidden font-mono text-[10px] text-ink-muted sm:inline">
              {freq} MHz
            </span>
          </div>
        </div>
      </div>

      {/* Right side actions: Heart + Tactile Play Button */}
      <div className="flex items-center gap-1.5 shrink-0 pl-1">
        <button
          type="button"
          onClick={handleFav}
          aria-label={fav ? "Remove preset" : "Save preset"}
          className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink transition-transform duration-tactile ease-spring hover:scale-110 active:scale-95 sm:opacity-0 sm:group-hover:opacity-100 ${
            fav
              ? "opacity-100 bg-status-red text-cream"
              : "bg-panel text-ink hover:bg-cream"
          }`}
        >
          <Heart className={`h-3.5 w-3.5 ${fav ? "fill-current" : ""}`} strokeWidth={2.5} />
        </button>

        <button
          type="button"
          onClick={handlePlayToggle}
          aria-label={live ? "Pause" : "Play station"}
          className={`flex h-9 w-9 items-center justify-center rounded-pill border-2 border-ink shadow-hard-sm transition-transform duration-tactile ease-spring hover:scale-105 active:scale-95 sm:h-10 sm:w-10 ${
            live
              ? "bg-ink text-cream"
              : "bg-[color:var(--g,#FFD166)] text-ink group-hover:scale-105"
          }`}
          style={{ backgroundColor: live ? "#1B1A17" : color, color: live ? "#FAF6EE" : ink }}
        >
          {live ? (
            <Pause className="h-4 w-4" strokeWidth={2.5} />
          ) : (
            <Play className="h-4 w-4 ml-0.5" strokeWidth={2.5} />
          )}
        </button>
      </div>
    </div>
  );
}
