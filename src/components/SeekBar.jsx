function formatTime(sec) {
  if (!sec || isNaN(sec) || sec < 0) return "00:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  if (m < 60) {
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  const h = Math.floor(m / 60);
  const remM = m % 60;
  return `${h}:${String(remM).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function SeekBar({
  position = 0,
  duration = 0,
  pct = 0,
  accent = "#FF6B6B",
  handleSeekChange,
}) {
  return (
    <div className="relative flex flex-col gap-2">
      {/* Custom Range Slider Track */}
      <div className="relative flex items-center">
        <input
          type="range"
          min="0"
          max={duration > 0 ? duration : 1}
          step="0.1"
          value={position}
          onChange={handleSeekChange}
          aria-label="Recording seek position"
          className="w-full h-3 cursor-pointer appearance-none rounded-pill border-2 border-ink outline-none transition-all"
          style={{
            background: `linear-gradient(to right, ${accent} ${pct}%, #E7E2D6 ${pct}%)`,
          }}
        />
      </div>

      {/* Time Indicators (mm:ss) */}
      <div className="flex items-center justify-between font-mono text-xs sm:text-sm font-black text-ink">
        <span className="rounded-pill border border-ink bg-cream px-2 py-0.5 shadow-hard-xs">
          {formatTime(position)}
        </span>
        <span className="rounded-pill border border-ink bg-cream px-2 py-0.5 shadow-hard-xs text-ink-muted">
          {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}
