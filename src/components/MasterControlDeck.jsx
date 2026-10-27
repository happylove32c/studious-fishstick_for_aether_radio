import { Pause, Play, Shuffle, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
import SleepTimerRow from "./SleepTimerRow";
import RecordingButton from "./RecordingButton";

export default function MasterControlDeck({
  prev,
  next,
  toggle,
  isPlaying,
  live,
  accent,
  ink,
  canSkip = true,
  shownVolume,
  muted,
  toggleMute,
  setVolume,
  isNative,
  RouteIcon,
  currentRoute,
  onRandomSpin,
  recordingProps,
  children,
}) {
  return (
    <div className="rounded-panel border-3 border-ink bg-panel p-5 shadow-hard sm:p-6">
      <h2 className="mb-4 font-fredoka text-lg font-bold uppercase tracking-wider text-ink">
        Master Control Deck
      </h2>

      {/* Transport Buttons: Prev, Play/Pause, Next */}
      <div className="grid grid-cols-[1fr_2.5fr_1fr] items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={prev}
          disabled={!canSkip}
          aria-label="Previous station"
          className="flex h-13 items-center justify-center rounded-pill border-2 border-ink bg-cream font-mono text-xs font-bold uppercase tracking-wider text-ink shadow-hard-sm transition-transform duration-tactile ease-spring hover:-translate-y-0.5 hover:shadow-hard active:translate-y-0 disabled:opacity-30"
        >
          <SkipBack className="h-5 w-5" strokeWidth={2.5} />
        </button>

        <button
          type="button"
          onClick={toggle}
          style={{ backgroundColor: live ? "#1B1A17" : accent, color: live ? "#FAF6EE" : ink }}
          className="flex h-12 items-center justify-center gap-2 rounded-pill border-3 border-ink font-fredoka text-sm font-bold uppercase tracking-wider shadow-hard transition-transform duration-tactile ease-spring hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-x-0.5 active:translate-y-0.5 sm:h-14 sm:gap-2.5 sm:text-lg"
        >
          {isPlaying ? (
            <>
              <Pause className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.5} />
              <span>Pause</span>
            </>
          ) : (
            <>
              <Play className="h-5 w-5 ml-0.5 sm:h-6 sm:w-6" strokeWidth={2.5} />
              <span>Transmit</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={next}
          disabled={!canSkip}
          aria-label="Next station"
          className="flex h-13 items-center justify-center rounded-pill border-2 border-ink bg-cream font-mono text-xs font-bold uppercase tracking-wider text-ink shadow-hard-sm transition-transform duration-tactile ease-spring hover:-translate-y-0.5 hover:shadow-hard active:translate-y-0 disabled:opacity-30"
        >
          <SkipForward className="h-5 w-5" strokeWidth={2.5} />
        </button>
      </div>

      {/* Record Broadcast Button */}
      {children || (recordingProps && <RecordingButton {...recordingProps} />)}

      {/* Volume Slider & Mute */}
      <div
        data-no-swipe
        className="mt-5 rounded-chunky border-2 border-ink bg-panel-inset p-3"
      >
        <div className="flex items-center justify-between font-mono text-xs font-bold text-ink mb-2">
          <span className="uppercase tracking-wider">Volume Output</span>
          <span>{Math.round(shownVolume * 100)}%</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? "Unmute" : "Mute"}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill border-2 border-ink bg-panel text-ink shadow-hard-sm transition-transform duration-tactile hover:scale-105 active:scale-95"
          >
            {muted ? (
              <VolumeX className="h-4 w-4" strokeWidth={2.5} />
            ) : (
              <Volume2 className="h-4 w-4" strokeWidth={2.5} />
            )}
          </button>

          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={shownVolume}
            onChange={(e) => setVolume(Number(e.target.value))}
            aria-label="Volume slider"
            className="np-slider h-2.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full border-2 border-ink outline-none"
            style={{
              background: `linear-gradient(to right, ${accent} ${
                shownVolume * 100
              }%, #FAF6EE ${shownVolume * 100}%)`,
            }}
          />
        </div>
      </div>

      {/* Sleep Timer */}
      <div className="mt-3" data-no-swipe>
        <SleepTimerRow live={live} />
      </div>

      {/* Audio Route Output Indicator */}
      {isNative && currentRoute && (
        <div className="mt-3 flex items-center justify-between font-mono text-xs font-bold uppercase">
          <span className="tracking-wider text-ink">Output</span>
          <div className="inline-flex items-center gap-1.5 rounded-chunky border-2 border-ink bg-panel-inset px-2.5 py-1 text-ink">
            {RouteIcon && <RouteIcon className="h-3.5 w-3.5" strokeWidth={2.5} />}
            <span>{currentRoute.label}</span>
          </div>
        </div>
      )}

      {/* Quick Actions: Random dial */}
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={onRandomSpin}
          className="flex flex-1 items-center justify-center gap-2 rounded-pill border-2 border-ink bg-cream py-2 font-mono text-xs font-bold uppercase tracking-wider text-ink shadow-hard-sm transition-transform duration-tactile hover:-translate-y-0.5 hover:shadow-hard active:translate-y-0"
        >
          <Shuffle className="h-3.5 w-3.5" strokeWidth={2.5} />
          <span>Random Frequency</span>
        </button>
      </div>
    </div>
  );
}
