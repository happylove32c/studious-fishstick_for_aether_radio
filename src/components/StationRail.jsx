import { useRef } from "react";
import { ChevronLeft, ChevronRight, Play, Pause, AudioLines, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePlayer } from "../context/usePlayer";
import { getGenreColor, readableOn } from "../utils/genreColors";
import { getFrequency } from "../utils/frequency";

export default function StationRail({
  title,
  subtitle,
  stations = [],
  allStations = [],
  showPresetKeys = false,
}) {
  const scrollRef = useRef(null);
  const { play, toggle, isCurrent, isPlaying, status, isFavorite, toggleFavorite } =
    usePlayer();
  const navigate = useNavigate();

  if (!stations || stations.length === 0) return null;

  const scroll = (direction) => {
    if (!scrollRef.current) return;
    const offset = direction === "left" ? -320 : 320;
    scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
  };

  const handleCardClick = (station) => {
    const isThis = isCurrent(station);
    if (!isThis) {
      play(station, allStations.length > 0 ? allStations : stations);
    }
    navigate("/now-playing");
  };

  const handleQuickPlay = (e, station) => {
    e.stopPropagation();
    const isThis = isCurrent(station);
    if (isThis) {
      toggle();
    } else {
      play(station, allStations.length > 0 ? allStations : stations);
    }
  };

  const handleFav = (e, station) => {
    e.stopPropagation();
    toggleFavorite(station);
  };

  return (
    <section className="mt-8 sm:mt-12">
      {/* Header with Title, Subtitle, and Carousel Arrows */}
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <h2 className="font-fredoka text-2xl font-bold uppercase tracking-tight text-ink sm:text-3xl md:text-4xl">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-1 font-mono text-xs font-bold uppercase tracking-wider text-ink-muted">
              {subtitle}
            </p>
          )}
        </div>

        {/* Desktop Carousel Navigation Arrows */}
        <div className="hidden sm:flex items-center gap-2">
          <button
            type="button"
            onClick={() => scroll("left")}
            aria-label="Scroll left"
            className="flex h-9 w-9 items-center justify-center rounded-pill border-2 border-ink bg-panel text-ink shadow-hard-sm transition-transform duration-tactile ease-spring hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard active:translate-x-0.5 active:translate-y-0.5"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            aria-label="Scroll right"
            className="flex h-9 w-9 items-center justify-center rounded-pill border-2 border-ink bg-panel text-ink shadow-hard-sm transition-transform duration-tactile ease-spring hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard active:translate-x-0.5 active:translate-y-0.5"
          >
            <ChevronRight className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Horizontal Scroll Track */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-4 pt-1 scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {stations.map((s, idx) => {
          const color = getGenreColor(s.genre);
          const ink = readableOn(color);
          const isThis = isCurrent(s);
          const live = isThis && isPlaying && status === "connected";
          const fav = isFavorite(s);
          const freq = getFrequency(s).toFixed(1);

          return (
            <div
              key={s._id || s.streamUrl || idx}
              onClick={() => handleCardClick(s)}
              className="group relative flex w-48 shrink-0 cursor-pointer flex-col justify-between overflow-hidden rounded-card border-3 border-ink bg-panel shadow-hard transition-all duration-tactile ease-spring hover:-translate-y-1 hover:shadow-hard-lg active:translate-y-0.5 sm:w-56"
            >
              {/* Top Graphic Sleeve Banner */}
              <div
                style={{ backgroundColor: color, color: ink }}
                className="relative flex h-28 w-full flex-col justify-between p-3 border-b-2 border-ink sm:h-32"
              >
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className="rounded-pill border-2 border-ink bg-panel/30 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider">
                      FM {freq}
                    </span>
                    {showPresetKeys && idx < 6 && (
                      <span
                        title={`Preset ${idx + 1} — press ${idx + 1} to tune`}
                        className="rounded-pill border-2 border-ink bg-ink px-1.5 py-0.5 font-mono text-[10px] font-black uppercase tracking-wider text-cream shadow-hard-xs"
                      >
                        {idx + 1}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleFav(e, s)}
                    aria-label={fav ? "Remove favorite" : "Add favorite"}
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-ink transition-transform duration-tactile ease-spring hover:scale-110 active:scale-95 ${
                      fav ? "bg-status-red text-cream" : "bg-panel text-ink"
                    }`}
                  >
                    <Heart className={`h-3 w-3 ${fav ? "fill-current" : ""}`} strokeWidth={2.5} />
                  </button>
                </div>

                {/* Genre Tag & On-Air state */}
                <div className="flex items-end justify-between">
                  <span className="font-mono text-xs font-black uppercase tracking-wider">
                    {s.genre}
                  </span>
                  {live && (
                    <span className="flex items-center gap-1 rounded-pill border border-ink bg-panel px-1.5 py-0.5 font-mono text-[9px] font-black uppercase text-ink shadow-[1px_1px_0px_#1B1A17]">
                      <AudioLines className="h-2.5 w-2.5 text-status-green-text" />
                      Live
                    </span>
                  )}
                </div>
              </div>

              {/* Bottom Body Details & Quick Play */}
              <div className="flex flex-1 flex-col justify-between p-3.5 sm:p-4">
                <div>
                  <h3 className="line-clamp-2 font-fredoka text-base font-bold uppercase leading-tight text-ink sm:text-lg">
                    {s.name}
                  </h3>
                  <p className="mt-1 font-mono text-[11px] font-bold text-ink-muted">
                    {freq} MHz • Stereo
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between pt-2 border-t border-ink/15">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                    {live ? "Broadcasting" : "Tune In"}
                  </span>

                  <button
                    type="button"
                    onClick={(e) => handleQuickPlay(e, s)}
                    aria-label={live ? "Pause" : "Play"}
                    style={{ backgroundColor: live ? "#1B1A17" : color, color: live ? "#FAF6EE" : ink }}
                    className="flex h-8 w-8 items-center justify-center rounded-pill border-2 border-ink shadow-hard-sm transition-transform duration-tactile ease-spring hover:scale-110 active:scale-95"
                  >
                    {live ? (
                      <Pause className="h-3.5 w-3.5" strokeWidth={2.5} />
                    ) : (
                      <Play className="h-3.5 w-3.5 ml-0.5" strokeWidth={2.5} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}