const TICKS = Array.from({ length: 41 }, (_, i) => i); // 88.0 .. 108.0

export default function TuningRuler({ pct, live, accent }) {
  const needle = live ? accent : "#1B1A17";

  return (
    <div className="mx-1 sm:mx-3 mt-2">
      <div className="relative h-8 border-b-2 border-ink pb-1">
        {TICKS.map((i) => (
          <span
            key={i}
            className={`absolute bottom-0 -translate-x-1/2 ${
              i % 4 === 0 ? "h-4 w-0.5 bg-ink" : "h-2 w-[1px] bg-ink/30"
            }`}
            style={{ left: `${(i / 40) * 100}%` }}
          />
        ))}

        {/* Needle indicator */}
        <div
          className="absolute bottom-0 top-0 w-1.5 -translate-x-1/2 rounded-full border border-ink transition-[left] duration-500 shadow-hard-sm"
          style={{ left: `${pct}%`, backgroundColor: needle }}
        />
      </div>

      <div className="relative mt-1.5 h-4 font-mono text-[10px] font-bold text-ink-muted sm:text-[11px]">
        {TICKS.filter((i) => i % 8 === 0).map((i) => (
          <span
            key={i}
            className="absolute -translate-x-1/2"
            style={{ left: `${(i / 40) * 100}%` }}
          >
            {88 + i / 2}
          </span>
        ))}
      </div>
    </div>
  );
}
