import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronDown,
  Disc3,
  Heart,
  ListMusic,
  Radio,
  Bluetooth,
  Headphones,
  Volume2,
  Smartphone,
} from "lucide-react";
import Header from "../components/Header";
import TuningRuler from "../components/TuningRuler";
import Equalizer from "../components/Equalizer";
import MasterControlDeck from "../components/MasterControlDeck";
import RecordingButton from "../components/RecordingButton";
import QueueSheet from "../components/QueueSheet";
import { useNowPlayingTrack } from "../hooks/useNowPlayingTrack";
import { useGoBack } from "../hooks/useGoBack";
import { usePlayer } from "../context/usePlayer";
import { useStations } from "../context/useStations";
import { useAudioRoute } from "../hooks/useAudioRoute";
import { useSwipeDownDismiss } from "../hooks/useSwipeDownDismiss";
import { getGenreColor, readableOn } from "../utils/genreColors";
import { getFrequency } from "../utils/frequency";

// ---------------------------------------------------------------------------
// Theme constants tuned for cream cartoon UI
// ---------------------------------------------------------------------------

const IDLE = "#57534E";
const noop = () => {};

const ROUTE_CONFIG = {
  bluetooth: { label: "Bluetooth", icon: Bluetooth },
  wired: { label: "Headphones", icon: Headphones },
  speaker: { label: "Speaker", icon: Volume2 },
  earpiece: { label: "Earpiece", icon: Smartphone },
};

// ---------------------------------------------------------------------------
// Main Now Playing Page (Studio Deck Layout)
// ---------------------------------------------------------------------------

export default function NowPlayingPage() {
  const {
    current,
    isPlaying,
    toggle,
    play,
    volume,
    setVolume,
    muted,
    toggleMute,
    error,
    status,
    playlist,
    next,
    prev,
    isFavorite,
    toggleFavorite,
    analyserRef,
    recording,
    recordElapsed,
    startRecording,
    stopRecording,
    getRecordStream,
  } = usePlayer();

  const { stations: allStations } = useStations();
  const goBack = useGoBack();
  const [queueOpen, setQueueOpen] = useState(false);
  const { ref: swipeRef, handlers: swipeHandlers } = useSwipeDownDismiss(goBack, {
    enabled: !queueOpen,
  });

  const { route, isNative } = useAudioRoute();
  const track = useNowPlayingTrack(current, isPlaying && status === "connected");
  const currentRoute = ROUTE_CONFIG[route] || ROUTE_CONFIG.speaker;
  const RouteIcon = currentRoute.icon;

  // Queue to display in modal
  const queue = useMemo(() => {
    if (playlist && playlist.length > 1) return playlist;
    return allStations || [];
  }, [playlist, allStations]);

  const handleRetry = useCallback(() => {
    if (current) play(current, playlist);
  }, [current, play, playlist]);

  const handleRandomSpin = () => {
    if (queue.length === 0) return;
    const rand = queue[Math.floor(Math.random() * queue.length)];
    play(rand, queue);
  };

  // -------------------------------------------------------------------------
  // Tactile Empty State
  // -------------------------------------------------------------------------
  if (!current) {
    return (
      <div
        ref={swipeRef}
        {...swipeHandlers}
        style={{ touchAction: "pan-y" }}
        className="min-h-screen bg-cream font-jetbrains text-ink touch-pan-y"
      >
        <Header />
        <main className="mx-auto flex max-w-xl flex-col items-center px-4 py-16 text-center sm:py-24">
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-panel border-3 border-ink bg-panel shadow-hard-lg">
            <Radio className="h-12 w-12 text-ink" strokeWidth={2.5} />
          </div>

          <p className="label font-bold uppercase text-ink-muted">Now tuned</p>
          <h1 className="mt-2 font-fredoka text-4xl font-bold uppercase leading-tight sm:text-6xl text-ink">
            No signal
          </h1>
          <p className="mt-3 max-w-sm font-mono text-xs font-medium text-ink-muted sm:text-sm">
            Pick a station on the radio dial to start transmitting.
          </p>

          <Link
            to="/"
            className="mt-8 inline-flex items-center justify-center rounded-pill border-3 border-ink bg-[#FFD166] px-8 py-3.5 font-fredoka text-base font-bold uppercase tracking-wide text-ink shadow-hard transition-transform duration-tactile ease-spring hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm"
          >
            Browse stations
          </Link>
        </main>
      </div>
    );
  }

  // Active Station Data
  const genre = current.genre || "Radio";
  const freq = getFrequency(current);
  const freqStr = freq.toFixed(1);
  const tunerPct = Math.min(Math.max(((freq - 88) / 20) * 100, 0), 100);

  const live = isPlaying && status === "connected";
  const fav = isFavorite(current);
  const shownVolume = muted ? 0 : volume;

  const accent = getGenreColor(current.genre);
  const ink = readableOn(accent);

  const recordStream = getRecordStream ? getRecordStream() : null;
  const canRecord = Boolean(live && recordStream);

  return (
    <div
      ref={swipeRef}
      {...swipeHandlers}
      style={{
        "--g": accent,
        "--gb": `${accent}99`,
        "--gt": ink,
      }}
      className="min-h-screen bg-cream font-jetbrains text-ink pb-12"
    >
      {/* 1. Studio Deck Top Bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b-3 border-ink bg-cream/95 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md sm:px-6 md:px-10">
        <button
          type="button"
          onClick={goBack}
          aria-label="Minimize"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-panel text-ink shadow-hard-sm transition-transform duration-tactile ease-spring hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard active:translate-x-0.5 active:translate-y-0.5 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink focus-visible:ring-offset-2"
        >
          <ChevronDown className="h-5 w-5" strokeWidth={2.5} />
        </button>

        <button
          type="button"
          onClick={() => setQueueOpen(true)}
          aria-label="Queue"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-panel text-ink shadow-hard-sm transition-transform duration-tactile ease-spring hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard active:translate-x-0.5 active:translate-y-0.5 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink focus-visible:ring-offset-2"
        >
          <ListMusic className="h-5 w-5" strokeWidth={2.5} />
        </button>

        <button
          type="button"
          onClick={() => toggleFavorite(current)}
          aria-pressed={fav}
          aria-label={fav ? "Remove from presets" : "Add to presets"}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-ink shadow-hard-sm transition-transform duration-tactile ease-spring hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard active:translate-x-0.5 active:translate-y-0.5 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink focus-visible:ring-offset-2 ${
            fav ? "bg-status-red text-cream" : "bg-panel text-ink hover:bg-cream"
          }`}
        >
          <Heart className={`h-5 w-5 ${fav ? "fill-current" : ""}`} strokeWidth={2.5} />
        </button>
      </header>

      {/* 2. Main Studio Deck Grid (Responsive 2-Column on Desktop) */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 md:px-10">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
          {/* Left Column (Cols 1-7): Merged Artwork Vinyl Stage & Spectrogram Deck */}
          <div className="flex flex-col gap-5 lg:col-span-7">
            {/* Merged Panel */}
            <div className="relative overflow-hidden rounded-panel border-3 border-ink bg-panel p-6 shadow-hard-lg sm:p-8">
              {/* Dynamic Aura */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -left-10 -top-10 h-64 w-64 rounded-full opacity-30 blur-3xl transition-colors duration-700"
                style={{ backgroundColor: accent }}
              />

              <div className="relative z-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
                {/* Vinyl Record Disc / Callout Badge */}
                <div className="relative flex shrink-0 items-center justify-center">
                  <div
                    style={{ backgroundColor: accent, color: ink }}
                    className="flex h-36 w-36 items-center justify-center rounded-card border-3 border-ink shadow-hard transition-transform duration-tactile sm:h-44 sm:w-44"
                  >
                    {/* Vinyl turntable concentric circles */}
                    <div className="relative flex h-28 w-28 items-center justify-center rounded-full border-2 border-ink bg-[#1B1A17] sm:h-36 sm:w-36">
                      <div className="h-20 w-20 rounded-full border border-cream/20 flex items-center justify-center">
                        <div
                          style={{ backgroundColor: accent }}
                          className={`flex h-10 w-10 items-center justify-center rounded-full border-2 border-ink text-ink ${
                            live ? "animate-[spin_4s_linear_infinite]" : ""
                          }`}
                        >
                          <Disc3 className="h-6 w-6" strokeWidth={2} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Station Callout Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      style={{ backgroundColor: accent, color: ink }}
                      className="rounded-pill border-2 border-ink px-3 py-0.5 font-mono text-[11px] font-black uppercase tracking-wider shadow-hard-sm"
                    >
                      {genre}
                    </span>
                    <span className="rounded-pill border-2 border-ink bg-panel-inset px-2.5 py-0.5 font-mono text-[11px] font-bold text-ink">
                      {freqStr} MHz FM
                    </span>
                  </div>

                  <h1 className="mt-3 font-fredoka text-3xl font-bold uppercase leading-tight text-ink sm:text-4xl md:text-5xl">
                    {current.name}
                  </h1>

                  <p className="mt-1 min-h-[1rem] truncate font-mono text-xs font-bold text-ink">
                    {track.title
                      ? track.artist
                        ? `${track.artist} - ${track.title}`
                        : track.title
                      : ""}
                  </p>
                </div>
              </div>

              {/* Equalizer (Canvas Spectrogram) */}
              <div
                data-no-swipe
                className="relative mt-6 min-h-[70px] h-20 sm:h-24 w-full flex"
              >
                <Equalizer
                  active={live}
                  analyserRef={analyserRef}
                  color={live ? accent : IDLE}
                  onMode={noop}
                />
              </div>

              {/* Tuning Ruler */}
              <div className="mt-4">
                <TuningRuler pct={tunerPct} live={live} accent={accent} />
              </div>
            </div>
          </div>

          {/* Right Column (Cols 8-12): Master Control Deck */}
          <div className="flex flex-col gap-5 lg:col-span-5">
            <MasterControlDeck
              prev={prev}
              next={next}
              toggle={toggle}
              isPlaying={isPlaying}
              live={live}
              accent={accent}
              ink={ink}
              canSkip={queue.length > 1}
              shownVolume={shownVolume}
              muted={muted}
              toggleMute={toggleMute}
              setVolume={setVolume}
              isNative={isNative}
              RouteIcon={RouteIcon}
              currentRoute={currentRoute}
              onRandomSpin={handleRandomSpin}
            >
              <RecordingButton
                recording={recording}
                canRecord={canRecord}
                live={live}
                recordStream={recordStream}
                recordElapsed={recordElapsed}
                startRecording={startRecording}
                stopRecording={stopRecording}
              />
            </MasterControlDeck>

            {/* Error Banner if any */}
            {error && (
              <div className="flex items-center justify-between gap-3 rounded-chunky border-2 border-status-red-text bg-[#FEE2E2] p-3 text-status-red-text shadow-hard-sm">
                <span className="truncate font-mono text-xs font-bold uppercase tracking-wider">
                  Signal error: {error}
                </span>
                <button
                  type="button"
                  onClick={handleRetry}
                  className="shrink-0 rounded-pill border-2 border-status-red-text bg-cream px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider hover:bg-status-red hover:text-cream transition-colors shadow-hard-sm"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 3. Queue Bottom Sheet Modal */}
      <QueueSheet
        isOpen={queueOpen}
        onClose={() => setQueueOpen(false)}
        queue={queue}
        current={current}
        live={live}
        onSelectStation={play}
      />
    </div>
  );
}
