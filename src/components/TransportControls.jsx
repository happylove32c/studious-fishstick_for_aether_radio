import { RotateCcw, RotateCw, Play, Pause } from "lucide-react";

export default function TransportControls({
  isPlaying,
  toggle,
  skip,
  rate,
  handleCycleSpeed,
  accent,
  ink,
}) {
  return (
    <div className="mt-5 flex items-center justify-between sm:justify-center sm:gap-8 pt-2">
      {/* Rewind 15s */}
      <button
        type="button"
        onClick={() => skip(-15)}
        aria-label="Rewind 15 seconds"
        title="Rewind 15s"
        className="flex h-12 w-12 sm:h-14 sm:w-14 flex-col items-center justify-center rounded-pill border-2 border-ink bg-cream text-ink shadow-hard-sm transition-transform duration-tactile ease-spring hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard active:translate-x-0.5 active:translate-y-0.5 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink"
      >
        <RotateCcw className="h-5 w-5" strokeWidth={2.5} />
        <span className="font-mono text-[9px] font-black leading-none mt-0.5">
          -15s
        </span>
      </button>

      {/* Main Play / Pause Button */}
      <button
        type="button"
        onClick={toggle}
        aria-label={isPlaying ? "Pause Recording" : "Play Recording"}
        style={{ backgroundColor: accent, color: ink }}
        className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-pill border-3 border-ink shadow-hard transition-transform duration-tactile ease-spring hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink"
      >
        {isPlaying ? (
          <Pause className="h-8 w-8 fill-current" strokeWidth={2.5} />
        ) : (
          <Play className="h-8 w-8 ml-1 fill-current" strokeWidth={2.5} />
        )}
      </button>

      {/* Fast Forward 15s */}
      <button
        type="button"
        onClick={() => skip(15)}
        aria-label="Fast forward 15 seconds"
        title="Forward 15s"
        className="flex h-12 w-12 sm:h-14 sm:w-14 flex-col items-center justify-center rounded-pill border-2 border-ink bg-cream text-ink shadow-hard-sm transition-transform duration-tactile ease-spring hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard active:translate-x-0.5 active:translate-y-0.5 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink"
      >
        <RotateCw className="h-5 w-5" strokeWidth={2.5} />
        <span className="font-mono text-[9px] font-black leading-none mt-0.5">
          +15s
        </span>
      </button>

      {/* Speed Pill (1x | 1.25x | 1.5x | 2x) */}
      <button
        type="button"
        onClick={handleCycleSpeed}
        aria-label={`Playback speed: ${rate}x. Tap to change.`}
        title="Cycle playback speed"
        className="flex h-11 px-3.5 sm:px-4 items-center justify-center rounded-pill border-2 border-ink bg-[#FFD166] text-ink shadow-hard-sm font-mono text-xs sm:text-sm font-black transition-transform duration-tactile ease-spring hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard active:translate-x-0.5 active:translate-y-0.5 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink"
      >
        <span>{rate}x</span>
      </button>
    </div>
  );
}
