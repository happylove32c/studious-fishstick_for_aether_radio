import { Radio, Calendar } from "lucide-react";

export default function CassetteDeck({
  activeRec,
  accent,
  pct = 0,
  isPlaying = false,
  spinStyle,
  formattedDate,
}) {
  return (
    <div className="relative overflow-hidden rounded-panel border-3 border-ink bg-panel p-5 shadow-hard-lg sm:p-7">
      {/* Subtle Accent Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-10 -top-10 h-56 w-56 rounded-full opacity-25 blur-3xl transition-colors duration-700"
        style={{ backgroundColor: accent }}
      />

      {/* Cassette Screws in the four corners */}
      <div className="absolute top-2.5 left-2.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-ink bg-cream font-mono text-[9px] font-black text-ink-muted">
        +
      </div>
      <div className="absolute top-2.5 right-2.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-ink bg-cream font-mono text-[9px] font-black text-ink-muted">
        +
      </div>
      <div className="absolute bottom-2.5 left-2.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-ink bg-cream font-mono text-[9px] font-black text-ink-muted">
        +
      </div>
      <div className="absolute bottom-2.5 right-2.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-ink bg-cream font-mono text-[9px] font-black text-ink-muted">
        +
      </div>

      {/* Tape Label Header Bar */}
      <div
        style={{ backgroundColor: accent }}
        className="relative rounded-t-chunky border-2 border-ink px-4 py-2.5 shadow-hard-sm"
      >
        <div className="flex items-center justify-between text-ink font-mono text-[10px] font-black uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-ink" />
            SIDE A • HI-FI STEREO
          </span>
          <span>AETHER TAPE LABS</span>
        </div>
        {/* Retro Tape Lines */}
        <div className="mt-1.5 flex h-1 w-full gap-1">
          <div className="h-full flex-1 rounded-full bg-ink/20" />
          <div className="h-full flex-1 rounded-full bg-ink/30" />
          <div className="h-full flex-1 rounded-full bg-ink/40" />
        </div>
      </div>

      {/* Cassette Tape Window Deck */}
      <div className="relative border-x-2 border-b-2 border-ink bg-cream p-4 sm:p-6 shadow-inner">
        {/* Cassette Center Recessed Window */}
        <div className="relative mx-auto flex h-36 sm:h-44 w-full max-w-lg items-center justify-between overflow-hidden rounded-xl border-3 border-ink bg-ink/90 px-6 sm:px-12 shadow-hard-inner">
          {/* Center Tape Counter Window Grid */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center opacity-70">
            <div className="flex items-center gap-2 font-mono text-[10px] font-bold text-cream">
              <span>100</span>
              <span>50</span>
              <span className="text-[#FFD166]">0</span>
              <span>50</span>
              <span>100</span>
            </div>
            <div className="mt-1 h-3 w-16 border-t border-b border-cream/30 flex items-center justify-center">
              <div className="h-1 w-1 rounded-full bg-[#FF6B6B]" />
            </div>
          </div>

          {/* Connecting Magnetic Tape Ribbon (between spools) */}
          <div className="pointer-events-none absolute bottom-5 left-14 right-14 h-2.5 bg-[#2B231D] border-t border-b border-[#40352C] opacity-80" />

          {/* Left Spool Reel (Supply Spool) */}
          <div className="relative flex items-center justify-center">
            {/* Wound Tape Outer Coil */}
            <div
              className="absolute rounded-full bg-[#3B2F2F] border-2 border-[#1E1717] transition-all duration-300"
              style={{
                width: `${Math.max(68, 92 - (pct / 100) * 24)}px`,
                height: `${Math.max(68, 92 - (pct / 100) * 24)}px`,
              }}
            />

            {/* Spinning Spool Hub */}
            <div
              style={isPlaying ? spinStyle : {}}
              className={`relative flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full border-2 border-ink bg-cream shadow-hard-xs ${
                isPlaying ? "animate-spin" : ""
              }`}
            >
              {/* Spool Teeth / Cogs */}
              <div className="absolute h-full w-2 bg-ink/20 rounded" />
              <div className="absolute h-full w-2 rotate-60 bg-ink/20 rounded" />
              <div className="absolute h-full w-2 -rotate-60 bg-ink/20 rounded" />
              {/* Center Spindle Hole */}
              <div className="h-6 w-6 rounded-full border-2 border-ink bg-ink" />
            </div>
          </div>

          {/* Right Spool Reel (Take-Up Spool) */}
          <div className="relative flex items-center justify-center">
            {/* Wound Tape Outer Coil */}
            <div
              className="absolute rounded-full bg-[#3B2F2F] border-2 border-[#1E1717] transition-all duration-300"
              style={{
                width: `${Math.max(68, 68 + (pct / 100) * 24)}px`,
                height: `${Math.max(68, 68 + (pct / 100) * 24)}px`,
              }}
            />

            {/* Spinning Spool Hub */}
            <div
              style={isPlaying ? spinStyle : {}}
              className={`relative flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full border-2 border-ink bg-cream shadow-hard-xs ${
                isPlaying ? "animate-spin" : ""
              }`}
            >
              {/* Spool Teeth / Cogs */}
              <div className="absolute h-full w-2 bg-ink/20 rounded" />
              <div className="absolute h-full w-2 rotate-60 bg-ink/20 rounded" />
              <div className="absolute h-full w-2 -rotate-60 bg-ink/20 rounded" />
              {/* Center Spindle Hole */}
              <div className="h-6 w-6 rounded-full border-2 border-ink bg-ink" />
            </div>
          </div>
        </div>

        {/* Bottom Tape Guide Roller Holes */}
        <div className="mt-3 flex items-center justify-around px-8">
          <div className="h-3 w-3 rounded-full border-2 border-ink bg-panel" />
          <div className="h-2 w-12 rounded-full border border-ink bg-panel-inset" />
          <div className="h-3 w-3 rounded-full border-2 border-ink bg-panel" />
        </div>
      </div>

      {/* Tape Details Label Footer */}
      <div className="mt-3 flex items-center justify-between font-mono text-[11px] font-bold text-ink-muted">
        <span className="flex items-center gap-1 text-ink">
          <Radio className="h-3.5 w-3.5" strokeWidth={2.5} />
          {activeRec?.stationName || "Live Radio Capture"}
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" strokeWidth={2.5} />
          {formattedDate}
        </span>
      </div>
    </div>
  );
}
