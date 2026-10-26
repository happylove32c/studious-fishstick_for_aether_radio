import { useState } from "react";
import { Timer } from "lucide-react";
import { useSleepTimer } from "../hooks/useSleepTimer";
import { PRESETS } from "../utils/sleepTimer";

function formatRemaining(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function SleepTimerRow({ live }) {
  const { active, remainingMs, start, cancel } = useSleepTimer();
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-3" data-no-swipe>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={`flex flex-1 items-center justify-between gap-2 rounded-pill border-2 border-ink px-3 py-2 font-mono text-xs font-bold uppercase tracking-wider shadow-hard-sm transition-transform duration-tactile hover:-translate-y-0.5 hover:shadow-hard active:translate-y-0 ${
            active ? "bg-[#FFD166] text-ink" : "bg-cream text-ink"
          }`}
        >
          <span className="inline-flex items-center gap-2">
            <Timer className="h-3.5 w-3.5" strokeWidth={2.5} />
            <span>{active ? formatRemaining(remainingMs) : "Sleep Timer"}</span>
          </span>
          <span className="text-[10px] text-ink-muted">
            {active ? "ON" : live ? "SET" : "—"}
          </span>
        </button>

        {active && (
          <button
            type="button"
            onClick={cancel}
            className="rounded-pill border-2 border-ink bg-panel px-3 py-2 font-mono text-[10px] font-black uppercase tracking-wider text-ink shadow-hard-sm active:scale-95"
          >
            Off
          </button>
        )}
      </div>

      {open && (
        <div className="mt-2 grid grid-cols-4 gap-2 rounded-chunky border-2 border-ink bg-panel-inset p-2">
          {PRESETS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                start(m);
                setOpen(false);
              }}
              className="rounded-pill border-2 border-ink bg-cream py-1.5 font-mono text-[11px] font-black uppercase tracking-wider text-ink shadow-hard-xs transition-transform duration-tactile hover:-translate-y-0.5 active:translate-y-0"
            >
              {m}m
            </button>
          ))}
        </div>
      )}
    </div>
  );
}