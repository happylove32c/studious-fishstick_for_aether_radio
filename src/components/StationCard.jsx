import { ArrowRight, AudioLines, Heart, Play } from "lucide-react";
import { useStationPlayback } from "../hooks/useStationPlayback";
import { getGenreColor, readableOn } from "../utils/genreColors";

export default function StationCard({ number, station, playlist, genre, presetNumber }) {
  const { live, fav, handleCardClick: handleClick, handleFav } =
    useStationPlayback(station, playlist);

  const cardGenre = genre || station.genre;
  const color = getGenreColor(cardGenre);
  const ink = readableOn(color);
  return (
    <div
      style={{ "--g": color, "--gb": `${color}99`, "--gt": ink }}
      className="group relative min-h-[160px] w-full sm:aspect-square sm:min-h-0"
    >
      <button
        onClick={handleClick}
        className={`flex h-full w-full flex-col justify-between rounded-card border-3 border-ink bg-[color:var(--g)] p-3.5 text-left text-[color:var(--gt)] shadow-hard transition-transform duration-tactile ease-spring group-hover:-translate-x-0.5 group-hover:-translate-y-0.5 group-hover:shadow-hard-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-cream sm:p-5 md:p-6`}
      >
        {/* Top bar: Number & Live Badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="whitespace-nowrap rounded-pill border-2 border-ink bg-panel/30 px-2.5 py-0.5 font-mono text-[11px] font-bold tracking-widest sm:text-xs">
              {number}
            </span>
            {presetNumber != null && (
              <span
                title={`Preset ${presetNumber} — press ${presetNumber} to tune`}
                className="inline-flex items-center gap-1 whitespace-nowrap rounded-pill border-2 border-ink bg-ink px-2 py-0.5 font-mono text-[10px] font-black uppercase tracking-wider text-cream shadow-hard-xs"
              >
                <span className="opacity-70">KEY</span>
                <span>{presetNumber}</span>
              </span>
            )}
            {live && (
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
            )}
          </div>
          {/* Space reserved for the heart sticker button */}
          <span className="h-9 w-9 shrink-0 sm:h-9 sm:w-9" aria-hidden="true" />
        </div>

        {/* Station Name & Genre */}
        <div className="my-auto min-w-0 py-1">
          <span className="label font-bold uppercase text-[color:var(--gt)]">
            Station
          </span>
          <span className="line-clamp-2 break-words font-fredoka text-lg font-bold uppercase leading-tight sm:text-2xl md:text-3xl">
            {station.name}
          </span>
          <span className="mt-1.5 block font-mono text-xs font-bold uppercase tracking-wider">
            {cardGenre}
          </span>
        </div>

        {/* Bottom row */}
        <div className="flex flex-col gap-2">
          <div className="h-0.5 w-full bg-ink/20 rounded-full" />

          <div className="flex items-center justify-between">
            <span className="whitespace-nowrap font-mono text-[11px] font-bold uppercase tracking-wider sm:text-xs">
              {live ? "Playing" : "Listen"}
            </span>

            <div className="flex h-7 w-7 items-center justify-center rounded-pill border-2 border-ink bg-panel/20 transition-transform duration-tactile ease-spring group-hover:translate-x-1 sm:h-8 sm:w-8">
              {live ? (
                <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
              ) : (
                <Play className="h-4 w-4 ml-0.5" strokeWidth={2.5} />
              )}
            </div>
          </div>
        </div>
      </button>

      {/*
        Round sticker heart button:
        Lives inside the group wrapper so hovering it keeps the card hovered,
        has its own tactile hover lift and press.
        The before pseudo-element expands the tap area to 44×44.
      */}
      <button
        onClick={handleFav}
        aria-pressed={fav}
        aria-label={fav ? "Remove from favorites" : "Add to favorites"}
        title={fav ? "Remove from favorites" : "Add to favorites"}
        className={`absolute right-2.5 top-2.5 z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 border-ink shadow-hard-sm transition-transform duration-tactile ease-spring hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink focus-visible:ring-offset-2 before:absolute before:inset-[-4px] before:content-[''] sm:right-3.5 sm:top-3.5 ${
          fav
            ? "bg-status-red text-cream"
            : "bg-panel text-ink hover:bg-cream"
        }`}
      >
        <Heart
          className={`h-4 w-4 ${fav ? "fill-current" : ""}`}
          strokeWidth={2.5}
        />
      </button>
    </div>
  );
}