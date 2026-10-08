import { Link, useLocation, useNavigate } from "react-router-dom";
import { Pause, Play, Square, Volume2 } from "lucide-react";
import { usePlayer } from "../context/usePlayer";

export default function PlayerBar() {
  const { current, isPlaying, toggle, stop, volume, setVolume, error } = usePlayer();
  const location = useLocation();
  const navigate = useNavigate();

  if (!current || location.pathname === "/now-playing") return null;

  const handleBarClick = () => {
    navigate("/now-playing");
  };

  // Prevent controls from triggering bar navigation
  const stopNav = (e) => e.stopPropagation();

  return (
    <div
      onClick={handleBarClick}
      className="fixed bottom-0 left-0 right-0 z-50 cursor-pointer border-t border-white/20 bg-black/90 backdrop-blur-md transition-colors hover:border-white/40"
    >
      <div className="flex items-center gap-4 px-6 py-4 md:px-10">
        {/* Play / Pause */}
        <button
          onClick={(e) => { stopNav(e); toggle(); }}
          className="flex h-10 w-10 items-center justify-center border border-white/20 text-white hover:border-white/50"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>

        {/* Station info – real Link for a11y */}
        <Link
          to="/now-playing"
          onClick={stopNav}
          className="min-w-0 flex-1 cursor-pointer"
        >
          <p className="truncate text-sm font-bold uppercase tracking-[0.15em] text-white">
            {current.name}
          </p>
          <p className="truncate text-[10px] uppercase tracking-[0.3em] text-white/40">
            {error ? `Error: ${error}` : current.genre || "Live"}
          </p>
        </Link>

        {/* Volume slider */}
        <div
          onClick={stopNav}
          className="hidden items-center gap-2 md:flex"
        >
          <Volume2 className="h-4 w-4 text-white/40" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="h-1 w-24 accent-white"
          />
        </div>

        {/* Stop */}
        <button
          onClick={(e) => { stopNav(e); stop(); }}
          className="flex h-10 w-10 items-center justify-center border border-white/20 text-white hover:border-white/50"
          aria-label="Stop"
        >
          <Square className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
