import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { CassetteTape, Radio, Settings, Shuffle, X } from "lucide-react";
import { useStations } from "../context/useStations";
import { usePlayer } from "../context/usePlayer";
import { useRandomTune } from "../hooks/useRandomTune";
import { useLockBodyScroll } from "../hooks/useLockBodyScroll";
import { useModalPresence } from "../hooks/useModalPresence";
import { registerModal } from "../utils/modalStack";
import { useSheetDrag } from "../hooks/useSheetDrag";

export default function MobileActionsModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { stations } = useStations();
  const { isPlaying, status } = usePlayer();
  const randomTune = useRandomTune();
  const { mounted, closing } = useModalPresence(isOpen);
  const { sheetRef, handleRef, hasEntered, onAnimationEnd } = useSheetDrag(onClose);

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

  const live = isPlaying && status === "connected";

  const handleRandomTune = () => {
    randomTune();
    onClose();
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Receiver Hub"
      className={`fixed inset-0 z-[100] flex items-end justify-center sm:hidden ${
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

      {/* Tactile Bottom Sheet Modal */}
      <div
        ref={sheetRef}
        onAnimationEnd={onAnimationEnd}
        className={`relative z-10 w-full max-w-lg max-h-[75vh] flex flex-col overflow-hidden rounded-t-panel border-t-3 border-x-3 border-ink bg-cream p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-ink shadow-[0_-8px_0px_#1B1A17] ${
          closing ? "animate-sheet-out" : hasEntered ? "" : "animate-sheet-in"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle element (drag notch plus header row) */}
        <div ref={handleRef} style={{ touchAction: "none" }} className="select-none">
          {/* Drag notch */}
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-ink/30 cursor-grab" />

          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b-2 border-ink">
            <div className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-ink" strokeWidth={2.5} />
              <h3 className="font-fredoka text-xl font-bold uppercase tracking-wide text-ink">
                Receiver Hub
              </h3>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close menu"
              className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink bg-panel text-ink shadow-hard-sm active:scale-95"
            >
              <X className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Content body */}
        <div
          className="mt-4 flex-1 space-y-3 overflow-y-auto overscroll-contain touch-pan-y [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ touchAction: "pan-y", overscrollBehavior: "contain" }}
        >
          {/* 1. Spin Random Dial Button */}
          <button
            type="button"
            onClick={handleRandomTune}
            className="flex w-full items-center justify-between rounded-card border-3 border-ink bg-[#FFD166] p-3.5 text-left text-ink shadow-hard transition-transform duration-tactile active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill border-2 border-ink bg-cream text-ink shadow-hard-sm">
                <Shuffle className="h-5 w-5" strokeWidth={2.5} />
              </div>
              <div>
                <span className="font-fredoka text-base font-bold uppercase leading-tight">
                  Spin Random Dial
                </span>
                <p className="font-mono text-[11px] font-bold text-ink/75">
                  Tune into a surprise broadcast
                </p>
              </div>
            </div>
            <span className="rounded-pill border-2 border-ink bg-cream px-2 py-0.5 font-mono text-[10px] font-black uppercase">
              Tune
            </span>
          </button>

          {/* 2. Recordings Link Row */}
          <button
            type="button"
            onClick={() => {
              navigate("/recordings");
              onClose();
            }}
            className="flex w-full items-center justify-between rounded-card border-3 border-ink bg-panel p-3.5 text-left text-ink shadow-hard transition-transform duration-tactile active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill border-2 border-ink bg-[#FF6B6B] text-ink shadow-hard-sm">
                <CassetteTape className="h-5 w-5" strokeWidth={2.5} />
              </div>
              <div>
                <span className="font-fredoka text-base font-bold uppercase leading-tight">
                  Recordings
                </span>
                <p className="font-mono text-[11px] font-bold text-ink/75">
                  Captured station broadcasts
                </p>
              </div>
            </div>
            <span className="rounded-pill border-2 border-ink bg-cream px-2 py-0.5 font-mono text-[10px] font-black uppercase">
              View
            </span>
          </button>

          {/* 3. Settings Link Row */}
          <button
            type="button"
            onClick={() => {
              navigate("/settings");
              onClose();
            }}
            className="flex w-full items-center justify-between rounded-card border-3 border-ink bg-panel p-3.5 text-left text-ink shadow-hard transition-transform duration-tactile active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill border-2 border-ink bg-[#4ECDC4] text-ink shadow-hard-sm">
                <Settings className="h-5 w-5" strokeWidth={2.5} />
              </div>
              <div>
                <span className="font-fredoka text-base font-bold uppercase leading-tight">
                  Settings
                </span>
                <p className="font-mono text-[11px] font-bold text-ink/75">
                  Playback, data & device options
                </p>
              </div>
            </div>
            <span className="rounded-pill border-2 border-ink bg-cream px-2 py-0.5 font-mono text-[10px] font-black uppercase">
              Open
            </span>
          </button>

          {/* 4. Telemetry Status Card */}
          <div className="rounded-card border-2 border-ink bg-panel p-3.5 shadow-hard-sm font-mono text-xs font-bold">
            <div className="flex items-center justify-between border-b border-panel-inset pb-2 mb-2">
              <span className="text-[10px] uppercase tracking-wider text-ink-muted">
                Signal Status
              </span>
              <span className="inline-flex items-center gap-1.5 text-ink">
                <span className={`h-2 w-2 rounded-full ${live ? "bg-status-green animate-pulse" : "bg-status-amber"}`} />
                <span>{live ? "Live Transmission" : "Receiver Ready"}</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="block text-[9px] text-ink-muted uppercase">Airwaves</span>
                <span>{stations.length} Frequencies</span>
              </div>
              <div>
                <span className="block text-[9px] text-ink-muted uppercase">Tuning Band</span>
                <span>88.0 – 108.0 MHz</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>,
    document.body
  );
}
