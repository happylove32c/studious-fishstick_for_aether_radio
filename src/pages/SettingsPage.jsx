import { useState } from "react";
import {
  Check,
  Headphones,
  HardDrive,
  Info,
  RotateCcw,
  Sliders,
  Smartphone,
  Trash2,
  Volume2,
  Bluetooth,
  RefreshCw,
} from "lucide-react";
import Header from "../components/Header";
import BackLink from "../components/BackLink";
import { usePlayer } from "../context/usePlayer";
import { useStations } from "../context/useStations";
import { useAudioRoute } from "../hooks/useAudioRoute";
import { isNativePlatform } from "../utils/nativeMediaControls";
import pkg from "../../package.json";

const ROUTE_CONFIG = {
  bluetooth: { label: "Bluetooth Audio", icon: Bluetooth },
  wired: { label: "Wired Headphones", icon: Headphones },
  speaker: { label: "Device Speaker", icon: Volume2 },
  earpiece: { label: "Earpiece Receiver", icon: Smartphone },
};

export default function SettingsPage() {
  const { current, isPlaying, setVolume, muted, toggleMute, stop } =
    usePlayer();
  const { reload, loading: stationsLoading } = useStations();
  const { route, isNative } = useAudioRoute();

  const [confirmingAction, setConfirmingAction] = useState(null);
  const [doneAction, setDoneAction] = useState(null);

  const showDone = (actionId) => {
    setDoneAction(actionId);
    setConfirmingAction(null);
    setTimeout(() => {
      setDoneAction((prev) => (prev === actionId ? null : prev));
    }, 2500);
  };

  // Playback Action 1: Reset volume to 80% and unmute
  const handleResetVolume = () => {
    setVolume(0.8);
    if (muted) {
      toggleMute();
    }
    showDone("reset-volume");
  };

  // Playback Action 2: Forget last station
  const handleForgetLastStation = () => {
    try {
      localStorage.removeItem("aether_last_station");
    } catch {
      // Ignore storage errors
    }
    if (!isPlaying) {
      stop();
    }
    showDone("forget-station");
  };

  // Data Action 1: Refresh stations
  const handleRefreshStations = () => {
    reload();
    showDone("refresh-stations");
  };

  // Data Action 2: Clear station cache
  const handleClearStationCache = () => {
    try {
      localStorage.removeItem("aether:stations:v2");
    } catch {
      // Ignore
    }
    reload();
    showDone("clear-cache");
  };

  // Data Action 3: Clear presets
  const handleClearPresets = () => {
    try {
      localStorage.removeItem("aether_favorites");
    } catch {
      // Ignore
    }
    showDone("clear-presets");
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const isNativeDevice = isNativePlatform() || isNative;
  const currentRouteConfig = ROUTE_CONFIG[route] || ROUTE_CONFIG.speaker;
  const RouteIcon = currentRouteConfig.icon;

  const renderConfirmSwap = (actionId, onConfirm, label, IconComponent) => {
    if (confirmingAction === actionId) {
      return (
        <div className="flex items-center gap-1.5 rounded-pill border-2 border-ink bg-[#FF6B6B] p-1 font-mono text-xs font-black text-ink shadow-hard-sm animate-scale-in">
          <span className="px-1.5 text-[10px] uppercase">Sure?</span>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-full border border-ink bg-cream px-2.5 py-0.5 text-[10px] uppercase shadow-hard-xs active:scale-95"
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => setConfirmingAction(null)}
            className="rounded-full border border-ink bg-panel px-2 py-0.5 text-[10px] uppercase shadow-hard-xs active:scale-95"
          >
            No
          </button>
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={() => setConfirmingAction(actionId)}
        className="flex items-center gap-1.5 rounded-pill border-2 border-ink bg-cream px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-wider text-ink shadow-hard-sm transition-transform duration-tactile ease-spring hover:-translate-y-0.5 hover:shadow-hard active:translate-y-0"
      >
        {IconComponent && <IconComponent className="h-3.5 w-3.5" strokeWidth={2.5} />}
        <span>{label}</span>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-cream font-jetbrains text-ink">
      <Header />

      <main
        className={`px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-8 sm:px-6 sm:py-8 md:px-10 md:py-12 ${
          current ? "pb-[15rem] md:pb-36" : "pb-[10rem] md:pb-16"
        }`}
      >
        <BackLink className="mb-6" />

        {/* Page Title */}
        <p className="label font-bold uppercase text-ink-muted">
          Receiver Configuration
        </p>
        <h1 className="font-fredoka text-5xl font-bold uppercase leading-none tracking-tight text-ink sm:text-7xl md:text-8xl">
          Settings
        </h1>

        <div className="mt-8 max-w-3xl space-y-6 sm:mt-12 sm:space-y-8">
          {/* ============================================================= */}
          {/* 1. PLAYBACK SECTION */}
          {/* ============================================================= */}
          <section className="rounded-panel border-3 border-ink bg-panel p-5 shadow-hard sm:p-7">
            <div className="flex items-center gap-2.5 border-b-2 border-ink pb-3">
              <Sliders className="h-5 w-5 text-ink" strokeWidth={2.5} />
              <h2 className="font-fredoka text-xl font-bold uppercase tracking-wide text-ink sm:text-2xl">
                Playback
              </h2>
            </div>

            <div className="mt-4 divide-y divide-ink/10">
              {/* Reset Volume */}
              <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-fredoka text-base font-bold text-ink">
                    Reset Audio Volume
                  </h3>
                  <p className="font-mono text-xs text-ink-muted">
                    Set receiver volume to default 80% and unmute if muted.
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  {doneAction === "reset-volume" && (
                    <span className="inline-flex items-center gap-1 rounded-pill border-2 border-ink bg-[#4ECDC4] px-2.5 py-1 font-mono text-[11px] font-black uppercase text-ink shadow-hard-xs animate-scale-in">
                      <Check className="h-3 w-3" strokeWidth={3} />
                      Done
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleResetVolume}
                    className="flex items-center gap-1.5 rounded-pill border-2 border-ink bg-cream px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-wider text-ink shadow-hard-sm transition-transform duration-tactile ease-spring hover:-translate-y-0.5 hover:shadow-hard active:translate-y-0"
                  >
                    <Volume2 className="h-3.5 w-3.5" strokeWidth={2.5} />
                    <span>Reset to 80%</span>
                  </button>
                </div>
              </div>

              {/* Forget Last Station */}
              <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-fredoka text-base font-bold text-ink">
                    Forget Last Station
                  </h3>
                  <p className="font-mono text-xs text-ink-muted">
                    Clear the remembered startup station and stops playback if paused.
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  {doneAction === "forget-station" && (
                    <span className="inline-flex items-center gap-1 rounded-pill border-2 border-ink bg-[#4ECDC4] px-2.5 py-1 font-mono text-[11px] font-black uppercase text-ink shadow-hard-xs animate-scale-in">
                      <Check className="h-3 w-3" strokeWidth={3} />
                      Done
                    </span>
                  )}
                  {renderConfirmSwap(
                    "forget-station",
                    handleForgetLastStation,
                    "Forget",
                    RotateCcw
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* ============================================================= */}
          {/* 2. DATA SECTION */}
          {/* ============================================================= */}
          <section className="rounded-panel border-3 border-ink bg-panel p-5 shadow-hard sm:p-7">
            <div className="flex items-center gap-2.5 border-b-2 border-ink pb-3">
              <HardDrive className="h-5 w-5 text-ink" strokeWidth={2.5} />
              <h2 className="font-fredoka text-xl font-bold uppercase tracking-wide text-ink sm:text-2xl">
                Data & Storage
              </h2>
            </div>

            <div className="mt-4 divide-y divide-ink/10">
              {/* Refresh Stations */}
              <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-fredoka text-base font-bold text-ink">
                    Refresh Stations
                  </h3>
                  <p className="font-mono text-xs text-ink-muted">
                    Fetch the latest live station directory from the airwaves.
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  {doneAction === "refresh-stations" && (
                    <span className="inline-flex items-center gap-1 rounded-pill border-2 border-ink bg-[#4ECDC4] px-2.5 py-1 font-mono text-[11px] font-black uppercase text-ink shadow-hard-xs animate-scale-in">
                      <Check className="h-3 w-3" strokeWidth={3} />
                      Done
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleRefreshStations}
                    disabled={stationsLoading}
                    className="flex items-center gap-1.5 rounded-pill border-2 border-ink bg-cream px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-wider text-ink shadow-hard-sm transition-transform duration-tactile ease-spring hover:-translate-y-0.5 hover:shadow-hard active:translate-y-0 disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${stationsLoading ? "animate-spin" : ""}`}
                      strokeWidth={2.5}
                    />
                    <span>{stationsLoading ? "Scanning…" : "Refresh"}</span>
                  </button>
                </div>
              </div>

              {/* Clear Station Cache */}
              <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-fredoka text-base font-bold text-ink">
                    Clear Station Cache
                  </h3>
                  <p className="font-mono text-xs text-ink-muted">
                    Remove local station cache and re-download fresh directory.
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  {doneAction === "clear-cache" && (
                    <span className="inline-flex items-center gap-1 rounded-pill border-2 border-ink bg-[#4ECDC4] px-2.5 py-1 font-mono text-[11px] font-black uppercase text-ink shadow-hard-xs animate-scale-in">
                      <Check className="h-3 w-3" strokeWidth={3} />
                      Done
                    </span>
                  )}
                  {renderConfirmSwap(
                    "clear-cache",
                    handleClearStationCache,
                    "Clear Cache",
                    Trash2
                  )}
                </div>
              </div>

              {/* Clear Presets */}
              <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-fredoka text-base font-bold text-ink">
                    Clear Presets
                  </h3>
                  <p className="font-mono text-xs text-ink-muted">
                    Remove all saved favorite stations and reset preset list.
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  {doneAction === "clear-presets" && (
                    <span className="inline-flex items-center gap-1 rounded-pill border-2 border-ink bg-[#4ECDC4] px-2.5 py-1 font-mono text-[11px] font-black uppercase text-ink shadow-hard-xs animate-scale-in">
                      <Check className="h-3 w-3" strokeWidth={3} />
                      Done
                    </span>
                  )}
                  {renderConfirmSwap(
                    "clear-presets",
                    handleClearPresets,
                    "Clear Presets",
                    Trash2
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* ============================================================= */}
          {/* 3. DEVICE SECTION (Native Platform Only) */}
          {/* ============================================================= */}
          {isNativeDevice && (
            <section className="rounded-panel border-3 border-ink bg-panel p-5 shadow-hard sm:p-7">
              <div className="flex items-center gap-2.5 border-b-2 border-ink pb-3">
                <Smartphone className="h-5 w-5 text-ink" strokeWidth={2.5} />
                <h2 className="font-fredoka text-xl font-bold uppercase tracking-wide text-ink sm:text-2xl">
                  Device
                </h2>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-2">
                <div>
                  <h3 className="font-fredoka text-base font-bold text-ink">
                    Current Audio Output
                  </h3>
                  <p className="font-mono text-xs text-ink-muted">
                    Detected hardware routing endpoint.
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  <div className="flex items-center gap-2 rounded-pill border-2 border-ink bg-[#FFD166] px-3.5 py-1.5 font-mono text-xs font-black uppercase tracking-wider text-ink shadow-hard-xs">
                    <RouteIcon className="h-4 w-4" strokeWidth={2.5} />
                    <span>{currentRouteConfig.label}</span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ============================================================= */}
          {/* 4. ABOUT SECTION */}
          {/* ============================================================= */}
          <section className="rounded-panel border-3 border-ink bg-panel p-5 shadow-hard sm:p-7">
            <div className="flex items-center gap-2.5 border-b-2 border-ink pb-3">
              <Info className="h-5 w-5 text-ink" strokeWidth={2.5} />
              <h2 className="font-fredoka text-xl font-bold uppercase tracking-wide text-ink sm:text-2xl">
                About
              </h2>
            </div>

            <div className="mt-4 space-y-3 font-mono text-xs font-bold text-ink">
              <div className="flex items-center justify-between py-2 border-b border-ink/10">
                <span className="text-ink-muted uppercase">Application</span>
                <span className="font-fredoka text-base font-bold">Aether FM</span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-ink/10">
                <span className="text-ink-muted uppercase">Version</span>
                <span className="rounded-pill border border-ink bg-cream px-2 py-0.5 shadow-hard-xs">
                  v{pkg.version || "1.0.0"}
                </span>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-ink-muted uppercase">Receiver Spec</span>
                <span className="text-ink">Analog & Web FM • 88.0 – 108.0 MHz</span>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
