import { Link, useLocation, useNavigate } from "react-router-dom";
import { Pause, Play, SkipBack, SkipForward, Square, Volume2 } from "lucide-react";
import { usePlayer } from "../context/usePlayer";
import { getGenreColor, readableOn } from "../utils/genreColors";

export default function PlayerBar() {
  const {
    current,
    isPlaying,
    status,
    toggle,
    stop,
    next,
    prev,
    playlist,
    volume,
    setVolume,
    error,
  } = usePlayer();
  const location = useLocation();
  const navigate = useNavigate();

  if (!current || location.pathname === "/now-playing") return null;

  const accent = getGenreColor(current.genre);
  const ink = readableOn(accent);
  const live = isPlaying && status === "connected";
  const canSkip = playlist.length > 1;

  const handleBarClick = () => {
    navigate("/now-playing");
  };

  const stopNav = (e) => e.stopPropagation();

  return (
    <aside
      aria-label="Audio Player Dock"
      onClick={handleBarClick}
      style={{ "--g": accent, "--gb": `${accent}99`, "--gt": ink }}
      className="fixed bottom-3 left-3 right-3 z-50 mx-auto max-w-4xl cursor-pointer select-none overflow-hidden rounded-panel border-3 border-ink bg-panel p-2.5 text-ink shadow-hard-lg transition-transform duration-tactile ease-spring sm:bottom-5 sm:left-6 sm:right-6 sm:p-3.5"
    >
      {/*
        Ambient blob: restyled for cream background without blur filters.
        Transform-only glide sweeps softly across the dock.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-panel"
      >
        <div
          className="blob-glide absolute left-0 top-1/2 h-[260%] w-1/2"
          style={{
            background: `radial-gradient(closest-side, ${accent}66, ${accent}00)`,
            opacity: live ? 0.75 : 0.25,
            animationPlayState: live ? "running" : "paused",
            transition: "opacity 700ms ease",
          }}
        />
      </div>

      <div className="relative flex items-center gap-2.5 sm:gap-4">
        {/* Transport Cluster */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {/* Prev Station */}
          <button
            onClick={(e) => {
              stopNav(e);
              prev();
            }}
            disabled={!canSkip}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill border-2 border-ink bg-cream text-ink shadow-hard-sm transition-transform duration-tactile ease-spring hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-hard-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink focus-visible:ring-offset-2"
            aria-label="Previous station"
          >
            <SkipBack className="h-4 w-4" strokeWidth={2.5} />
          </button>

          {/* Big Play / Pause Button */}
          <button
            onClick={(e) => {
              stopNav(e);
              toggle();
            }}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-pill border-3 border-ink bg-[color:var(--g)] text-[color:var(--gt)] shadow-hard transition-transform duration-tactile ease-spring hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink focus-visible:ring-offset-2 sm:h-13 sm:w-13"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.5} />
            ) : (
              <Play className="h-5 w-5 ml-0.5 sm:h-6 sm:w-6" strokeWidth={2.5} />
            )}
          </button>

          {/* Next Station */}
          <button
            onClick={(e) => {
              stopNav(e);
              next();
            }}
            disabled={!canSkip}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill border-2 border-ink bg-cream text-ink shadow-hard-sm transition-transform duration-tactile ease-spring hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-hard-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink focus-visible:ring-offset-2"
            aria-label="Next station"
          >
            <SkipForward className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>

        {/* Station Info Link */}
        <Link
          to="/now-playing"
          onClick={stopNav}
          className="min-w-0 flex-1 px-1 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink focus-visible:ring-offset-2 rounded-chunky"
        >
          <p className="truncate font-fredoka text-base font-bold uppercase leading-tight text-ink sm:text-lg">
            {current.name}
          </p>
          <p className="mt-0.5 truncate font-mono text-xs font-bold uppercase tracking-wider">
            {error ? (
              <span className="text-status-red-text font-bold">Signal Error: {error}</span>
            ) : (
              <span className="text-ink-muted">
                {current.genre || "Live Radio"}
              </span>
            )}
          </p>
        </Link>

        {/* Volume Slider */}
        <div
          onClick={stopNav}
          className="hidden items-center gap-2.5 rounded-pill border-2 border-ink bg-panel-inset px-3 py-1.5 md:flex"
        >
          <Volume2 className="h-4 w-4 shrink-0 text-ink" strokeWidth={2.5} />
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            aria-label="Volume"
            className="np-slider h-1.5 w-24 cursor-pointer appearance-none outline-none rounded-full"
            style={{
              background: `linear-gradient(to right, ${accent} ${volume * 100}%, #1B1A1722 ${volume * 100}%)`,
            }}
          />
        </div>

        {/* Stop Transport Button */}
        <button
          onClick={(e) => {
            stopNav(e);
            stop();
          }}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill border-2 border-ink bg-cream text-ink shadow-hard-sm transition-transform duration-tactile ease-spring hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink focus-visible:ring-offset-2"
          aria-label="Stop playback"
        >
          <Square className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </div>
    </aside>
  );
}