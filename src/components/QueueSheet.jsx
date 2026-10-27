import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AudioLines, ListMusic, Play, X } from "lucide-react";
import { useModalPresence } from "../hooks/useModalPresence";
import { useSheetDrag } from "../hooks/useSheetDrag";
import { useLockBodyScroll } from "../hooks/useLockBodyScroll";
import { registerModal } from "../utils/modalStack";
import { getGenreColor } from "../utils/genreColors";
import { getFrequency } from "../utils/frequency";

export default function QueueSheet({
  isOpen,
  onClose,
  queue = [],
  current,
  live,
  onSelectStation,
}) {
  const { mounted, closing } = useModalPresence(isOpen);
  const {
    sheetRef,
    handleRef,
    hasEntered,
    onAnimationEnd,
  } = useSheetDrag(onClose);

  useLockBodyScroll(mounted);

  useEffect(() => {
    if (!isOpen) return;
    return registerModal(onClose);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Up Next Queue"
      className={`fixed inset-0 z-[100] flex items-end justify-center ${
        closing ? "pointer-events-none" : ""
      }`}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-ink/50 backdrop-blur-sm ${
          closing ? "animate-backdrop-out" : "animate-backdrop-in"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        onAnimationEnd={onAnimationEnd}
        className={`relative w-full max-w-lg max-h-[75vh] flex flex-col overflow-hidden rounded-t-panel border-t-3 border-x-3 border-ink bg-cream shadow-hard-lg pb-[max(1rem,env(safe-area-inset-bottom))] ${
          closing ? "animate-sheet-out" : hasEntered ? "" : "animate-sheet-in"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle element (drag notch plus header row) */}
        <div ref={handleRef} style={{ touchAction: "none" }} className="select-none">
          {/* Drag notch */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1.5 w-12 rounded-full border border-ink bg-ink/30 cursor-grab" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-panel-inset px-5 py-3">
            <div className="flex items-center gap-2">
              <ListMusic className="h-5 w-5 text-ink" strokeWidth={2.5} />
              <h3 className="font-fredoka text-lg font-bold uppercase tracking-wider text-ink">
                Up Next
              </h3>
              <span className="font-mono text-xs font-bold text-ink-muted">
                ({queue.length})
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close queue"
              className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-ink bg-panel text-ink shadow-hard-sm transition-transform duration-tactile ease-spring hover:scale-105 active:scale-95"
            >
              <X className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Scrollable list */}
        <div
          className="flex-1 space-y-2 overflow-y-auto overscroll-contain touch-pan-y px-5 py-3 pr-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ touchAction: "pan-y", overscrollBehavior: "contain" }}
        >
          {queue.map((s, idx) => {
            const isCurrentThis =
              current &&
              (current._id === s._id || current.streamUrl === s.streamUrl);
            const sColor = getGenreColor(s.genre);
            const sFreq = getFrequency(s).toFixed(1);

            return (
              <div
                key={s._id || s.streamUrl || idx}
                onClick={() => {
                  onSelectStation(s, queue);
                  onClose();
                }}
                className={`group flex cursor-pointer items-center justify-between rounded-chunky border-2 border-ink p-2 transition-all duration-tactile ${
                  isCurrentThis
                    ? "bg-cream shadow-hard-sm ring-2 ring-ink"
                    : "bg-panel hover:bg-panel-inset"
                }`}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <div
                    style={{ backgroundColor: sColor }}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-chunky border border-ink font-mono text-[9px] font-black text-ink shadow-[1px_1px_0px_#1B1A17]"
                  >
                    {isCurrentThis && live ? (
                      <AudioLines className="h-4 w-4" />
                    ) : (
                      <span>{sFreq}</span>
                    )}
                  </div>

                  <div className="min-w-0 pr-1">
                    <p className="truncate font-fredoka text-sm font-bold uppercase text-ink">
                      {s.name}
                    </p>
                    <p className="font-mono text-[10px] text-ink-muted uppercase">
                      {s.genre} • {sFreq} MHz
                    </p>
                  </div>
                </div>

                <div className="shrink-0 pl-1">
                  {isCurrentThis ? (
                    <span className="rounded-pill border border-ink bg-status-green px-2 py-0.5 font-mono text-[9px] font-black uppercase text-cream">
                      On Air
                    </span>
                  ) : (
                    <button
                      type="button"
                      aria-label="Tune into station"
                      className="flex h-7 w-7 items-center justify-center rounded-pill border border-ink bg-cream opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Play
                        className="h-3.5 w-3.5 ml-0.5 text-ink"
                        strokeWidth={2.5}
                      />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
}
