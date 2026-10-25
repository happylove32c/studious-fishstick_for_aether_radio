import { useState } from "react";
import { Play, Pause, Radio, Heart, Shuffle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePlayer } from "../context/usePlayer";
import { getGenreColor, readableOn } from "../utils/genreColors";
import { getFrequency } from "../utils/frequency";

export default function FeaturedHero({ stations = [] }) {
  const { current, isPlaying, status, play, toggle, isFavorite, toggleFavorite } =
    usePlayer();
  const navigate = useNavigate();

  // If a station is already playing or selected, feature it. Otherwise pick a featured one.
  const [featuredIndex] = useState(() => {
    const lofiIdx = stations.findIndex((s) => s.genre?.toLowerCase() === "lofi");
    return lofiIdx >= 0 ? lofiIdx : 0;
  });

  // If there's no active playback, default to the second station or first
  const displayStation = current || stations[featuredIndex] || stations[0];

  if (!displayStation) return null;

  const color = getGenreColor(displayStation.genre);
  const ink = readableOn(color);
  const freq = getFrequency(displayStation).toFixed(1);
  const isCurrentStation = current && (current._id === displayStation._id || current.streamUrl === displayStation.streamUrl);
  const live = isCurrentStation && isPlaying && status === "connected";
  const fav = isFavorite(displayStation);

  const handleTuneIn = () => {
    if (isCurrentStation) {
      toggle();
    } else {
      play(displayStation, stations);
    }
  };

  const handleSurpriseSpin = () => {
    if (stations.length === 0) return;
    const randIdx = Math.floor(Math.random() * stations.length);
    const chosen = stations[randIdx];
    play(chosen, stations);
  };

  const openNowPlaying = () => {
    navigate("/now-playing");
  };

  return (
    <section className="relative overflow-hidden rounded-panel border-3 border-ink bg-panel p-5 shadow-hard-lg sm:p-7 md:p-8">
      {/* Background ambient radial glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full opacity-35 blur-2xl transition-all duration-700 sm:h-96 sm:w-96"
        style={{ backgroundColor: color }}
      />

      {/* Retro decorative grid pattern overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "radial-gradient(#1B1A17 1.5px, transparent 1.5px), radial-gradient(#1B1A17 1.5px, #FAF6EE 1.5px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
        {/* Left Column: Station Highlights */}
        <div className="max-w-2xl">
          {/* Top Pill Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-pill border-2 border-ink bg-panel px-3 py-1 font-mono text-[11px] font-black uppercase tracking-wider text-ink shadow-hard-sm">
              <span className={`h-2 w-2 rounded-full ${live ? "bg-status-red animate-ping" : "bg-ink"}`} />
              {live ? "Now Broadcasting" : "Featured Station"}
            </span>

            <span
              style={{ backgroundColor: color, color: ink }}
              className="rounded-pill border-2 border-ink px-3 py-1 font-mono text-[11px] font-black uppercase tracking-wider shadow-hard-sm"
            >
              {displayStation.genre}
            </span>

            <span className="hidden items-center gap-1 rounded-pill border-2 border-ink bg-panel-inset px-2.5 py-1 font-mono text-[11px] font-bold uppercase text-ink-muted sm:inline-flex">
              <Radio className="h-3 w-3 text-ink" />
              {freq} MHz FM
            </span>
          </div>

          {/* Huge Display Heading */}
          <h2
            onClick={openNowPlaying}
            className="mt-4 cursor-pointer font-fredoka text-3xl font-bold uppercase leading-none tracking-tight text-ink hover:underline sm:text-5xl md:text-6xl"
          >
            {displayStation.name}
          </h2>

          {/* Frequency & Technical strip */}
          <div className="mt-4 flex flex-wrap items-center gap-3 font-mono text-[11px] font-bold text-ink sm:gap-4 sm:text-xs">
            <div className="flex items-center gap-1.5 rounded-chunky border border-ink/30 bg-panel-inset px-2.5 py-1">
              <span>BAND: 88-108 MHz</span>
            </div>
            <div className="text-ink-muted">
              CH: #{displayStation._id?.slice(-4).toUpperCase() || "AIR-1"}
            </div>
          </div>
        </div>

        {/* Right Column: Hero Controls & Interactive Dial */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:flex-col lg:items-end">
          {/* Main Action Button */}
          <button
            type="button"
            onClick={handleTuneIn}
            style={{ backgroundColor: live ? "#1B1A17" : color, color: live ? "#FAF6EE" : ink }}
            className="flex items-center justify-center gap-3 rounded-pill border-3 border-ink px-6 py-4 font-fredoka text-lg font-bold uppercase tracking-wider shadow-hard transition-transform duration-tactile ease-spring hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm sm:px-8 sm:text-xl"
          >
            {live ? (
              <>
                <Pause className="h-6 w-6" strokeWidth={3} />
                <span>Pause Transmission</span>
              </>
            ) : (
              <>
                <Play className="h-6 w-6 ml-0.5" strokeWidth={3} />
                <span>Tune In Now</span>
              </>
            )}
          </button>

          {/* Secondary Buttons Row */}
          <div className="flex items-center gap-2">
            {/* Random Dial Spinner */}
            <button
              type="button"
              onClick={handleSurpriseSpin}
              title="Tune into a random frequency"
              className="flex flex-1 items-center justify-center gap-2 rounded-pill border-2 border-ink bg-cream px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-ink shadow-hard-sm transition-transform duration-tactile ease-spring hover:-translate-y-0.5 hover:shadow-hard active:translate-y-0 active:shadow-hard-sm sm:flex-none"
            >
              <Shuffle className="h-4 w-4" strokeWidth={2.5} />
              <span>Spin Dial</span>
            </button>

            {/* Favorite Button */}
            <button
              type="button"
              onClick={() => toggleFavorite(displayStation)}
              aria-label={fav ? "Remove from presets" : "Add to presets"}
              className={`flex h-11 w-11 items-center justify-center rounded-full border-2 border-ink shadow-hard-sm transition-transform duration-tactile ease-spring hover:scale-105 active:scale-95 ${
                fav ? "bg-status-red text-cream" : "bg-panel text-ink hover:bg-cream"
              }`}
            >
              <Heart className={`h-5 w-5 ${fav ? "fill-current" : ""}`} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
