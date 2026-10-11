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

  // Same theme variables as the genre cards and the Now Playing page.
  const accent = getGenreColor(current.genre);
  const ink = readableOn(accent);
  const live = isPlaying && status === "connected";

  const canSkip = playlist.length > 1;

  const handleBarClick = () => {
    navigate("/now-playing");
  };

  // Prevent controls from triggering bar navigation
  const stopNav = (e) => e.stopPropagation();

  return (
    <div
      onClick={handleBarClick}
      style={{ "--g": accent, "--gb": `${accent}99`, "--gt": ink }}
      className="fixed bottom-0 left-0 right-0 z-50 cursor-pointer overflow-hidden border-t border-[color:var(--gb)] bg-black/95 transition-colors hover:border-[color:var(--g)]"
    >
      {/*
        Ambient blob. Only `transform` is animated (compositor-only, no layout,
        no paint, no blur filter), so it stays cheap on low-end phones.
        It glides while the station is live; when paused or connecting it
        freezes and dims. Peak alpha is 30%: measured against every genre
        colour, that keeps both the white text and the accent-coloured genre
        line at 4.5:1 contrast or better (40% failed on pink genres).
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div
          className="blob-glide absolute left-0 top-1/2 h-[260%] w-1/2"
          style={{
            background: `radial-gradient(closest-side, ${accent}4c, ${accent}00)`,
            opacity: live ? 1 : 0.35,
            animationPlayState: live ? "running" : "paused",
            transition: "opacity 700ms ease",
          }}
        />
      </div>

      <div className="relative flex items-center gap-3 px-4 py-4 sm:gap-4 sm:px-6 md:px-10">
        {/* Transport cluster */}
        <div className="flex shrink-0 items-center gap-2">
          {/* Prev */}
          <button
            onClick={(e) => {
              stopNav(e);
              prev();
            }}
            disabled={!canSkip}
            className="flex h-10 w-10 shrink-0 items-center justify-center border border-[color:var(--gb)] text-white transition-colors hover:border-[color:var(--g)] hover:bg-[color:var(--g)] hover:text-[color:var(--gt)] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-[color:var(--gb)] disabled:hover:bg-transparent disabled:hover:text-white"
            aria-label="Previous station"
          >
            <SkipBack className="h-3.5 w-3.5" />
          </button>

          {/* Play / Pause */}
          <button
            onClick={(e) => {
              stopNav(e);
              toggle();
            }}
            className="flex h-10 w-10 shrink-0 items-center justify-center bg-[color:var(--g)] text-[color:var(--gt)] transition-[filter] hover:brightness-110"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </button>

          {/* Next */}
          <button
            onClick={(e) => {
              stopNav(e);
              next();
            }}
            disabled={!canSkip}
            className="flex h-10 w-10 shrink-0 items-center justify-center border border-[color:var(--gb)] text-white transition-colors hover:border-[color:var(--g)] hover:bg-[color:var(--g)] hover:text-[color:var(--gt)] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-[color:var(--gb)] disabled:hover:bg-transparent disabled:hover:text-white"
            aria-label="Next station"
          >
            <SkipForward className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Station info - real Link for a11y */}
        <Link
          to="/now-playing"
          onClick={stopNav}
          className="min-w-0 flex-1 cursor-pointer"
        >
          <p className="truncate text-sm font-bold uppercase tracking-[0.15em] text-white">
            {current.name}
          </p>
          <p
            className="truncate text-[11px] font-bold uppercase tracking-[0.3em]"
            style={{ color: error ? "#f87171" : accent }}
          >
            {error ? `Error: ${error}` : current.genre || "Live"}
          </p>
        </Link>

        {/* Volume slider */}
        <div onClick={stopNav} className="hidden items-center gap-2 md:flex">
          <Volume2 className="h-4 w-4 text-white/60" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            aria-label="Volume"
            className="h-1 w-24"
            style={{ accentColor: accent }}
          />
        </div>

        {/* Stop */}
        <button
          onClick={(e) => {
            stopNav(e);
            stop();
          }}
          className="flex h-10 w-10 shrink-0 items-center justify-center border border-[color:var(--gb)] text-white transition-colors hover:border-[color:var(--g)] hover:bg-[color:var(--g)] hover:text-[color:var(--gt)]"
          aria-label="Stop"
        >
          <Square className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}