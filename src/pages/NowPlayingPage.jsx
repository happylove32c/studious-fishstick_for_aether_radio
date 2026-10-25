import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { useNowPlayingTrack } from "../hooks/useNowPlayingTrack";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  AudioLines,
  Bluetooth,
  ChevronDown,
  Circle,
  Disc3,
  Headphones,
  Heart,
  ListMusic,
  Pause,
  Play,
  Radio,
  Shuffle,
  SkipBack,
  SkipForward,
  Smartphone,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import Header from "../components/Header";
import { useGoBack } from "../hooks/useGoBack";
import { usePlayer } from "../context/usePlayer";
import { useStations } from "../context/useStations";
import { useAudioRoute } from "../hooks/useAudioRoute";
import { useLockBodyScroll } from "../hooks/useLockBodyScroll";
import { useModalPresence } from "../hooks/useModalPresence";
import { registerModal } from "../utils/modalStack";
import { useSheetDrag } from "../hooks/useSheetDrag";
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
// Tuning ruler restyled for cream cartoon UI
// ---------------------------------------------------------------------------

const TICKS = Array.from({ length: 41 }, (_, i) => i); // 88.0 .. 108.0

function TuningRuler({ pct, live, accent }) {
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

// ---------------------------------------------------------------------------
// Equalizer: Spectrogram bars drawn rounded with genre colour & ink outline
// ---------------------------------------------------------------------------

const BAR_COUNT = 24;
const FLOOR = 4;

function makeBands(binCount) {
  const maxBin = Math.min(binCount - 1, Math.round(binCount * 0.55));
  const edges = [];
  for (let i = 0; i <= BAR_COUNT; i++) {
    edges.push(1 + Math.round(Math.pow(i / BAR_COUNT, 1.8) * (maxBin - 1)));
  }
  return Array.from({ length: BAR_COUNT }, (_, i) => [
    edges[i],
    Math.max(edges[i] + 1, edges[i + 1]),
  ]);
}

function bandLevels(data, bands) {
  return bands.map(([lo, hi], i) => {
    let peak = 0;
    for (let b = lo; b < hi && b < data.length; b++) {
      if (data[b] > peak) peak = data[b];
    }
    const tilt = 1 + (i / BAR_COUNT) * 0.7;
    return Math.min(1, Math.pow(peak / 255, 1.5) * tilt);
  });
}

function Equalizer({ active, analyserRef, color, onMode }) {
  const canvasRef = useRef(null);
  const heightsRef = useRef(new Array(BAR_COUNT).fill(FLOOR));
  const sizeRef = useRef({ width: 0, height: 0, dpr: 1 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const paint = () => {
      const { width: w, height: h } = sizeRef.current;
      if (w === 0 || h === 0) return;
      ctx.clearRect(0, 0, w, h);

      const gap = 5;
      const barW = Math.max(4, (w - (BAR_COUNT - 1) * gap) / BAR_COUNT);

      heightsRef.current.forEach((bh, i) => {
        const hh = Math.max(5, Math.min(bh, h));
        const x = Math.floor(i * (barW + gap));
        const y = Math.floor(h - hh);
        const radius = Math.min(barW / 2, 6);

        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, y, barW, hh, [radius, radius, 0, 0]);
        } else {
          ctx.rect(x, y, barW, hh);
        }
        ctx.fillStyle = color;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#1B1A17";
        ctx.stroke();
      });
    };

    const updateSize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      if (w === 0 || h === 0) return;
      const s = sizeRef.current;
      if (s.width !== w || s.height !== h || s.dpr !== dpr) {
        sizeRef.current = { width: w, height: h, dpr };
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        paint();
      }
    };

    updateSize();

    let observer;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(updateSize);
      observer.observe(canvas);
    }

    let raf = 0;
    let data = null;
    let bands = null;
    let silentFrames = 0;
    let heard = false;
    let mode = null;

    const setMode = (m) => {
      if (m !== mode) {
        mode = m;
        onMode(m);
      }
    };

    const render = (time) => {
      const { height: h } = sizeRef.current;
      const analyser = active ? analyserRef.current : null;
      let levels = null;

      if (analyser) {
        if (!data || data.length !== analyser.frequencyBinCount) {
          data = new Uint8Array(analyser.frequencyBinCount);
          bands = makeBands(data.length);
        }
        analyser.getByteFrequencyData(data);

        let peak = 0;
        for (let i = 0; i < data.length; i++) {
          if (data[i] > peak) peak = data[i];
        }
        if (peak > 0) {
          heard = true;
          silentFrames = 0;
        } else {
          silentFrames++;
        }

        if (heard && silentFrames < 180) {
          setMode("live");
          levels = bandLevels(data, bands);
        } else {
          setMode("sim");
        }
      } else if (active) {
        setMode("sim");
      } else {
        setMode("idle");
      }

      if (levels === null && active) {
        const t = time * 0.003;
        levels = Array.from({ length: BAR_COUNT }, (_, i) => {
          const s1 = Math.sin(t * 1.7 + i * 0.35);
          const s2 = Math.cos(t * 0.9 - i * 0.2);
          const s3 = Math.sin(t * 2.5 + i * 0.8);
          const raw = (s1 + s2 + s3 + 3) / 6;
          const hump = Math.sin((i / (BAR_COUNT - 1)) * Math.PI);
          return Math.max(0.08, raw * 0.75 + hump * 0.25);
        });
      }

      const prevHeights = heightsRef.current;
      let moving = false;
      const targetHeights = levels
        ? levels.map((l) => FLOOR + l * (h - FLOOR - 4))
        : new Array(BAR_COUNT).fill(FLOOR);

      const nextHeights = prevHeights.map((currentH, i) => {
        const target = targetHeights[i];
        let nextH;
        if (target > currentH) {
          nextH = currentH + (target - currentH) * 0.45;
        } else {
          nextH = currentH - 2.8;
          if (nextH < target) nextH = target;
        }
        if (Math.abs(nextH - currentH) > 0.3) moving = true;
        return nextH;
      });

      heightsRef.current = nextHeights;
      paint();

      if (active || moving) raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      if (observer) observer.disconnect();
    };
  }, [active, analyserRef, color, onMode]);

  return (
    <div className="relative min-h-[50px] flex-1">
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Now Playing Page (Spotify / Studio Deck Redesign)
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
    // format,
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
  const { mounted: queueMounted, closing: queueClosing } = useModalPresence(queueOpen);
  const {
    sheetRef: queueSheetRef,
    handleRef: queueHandleRef,
    hasEntered: queueHasEntered,
    onAnimationEnd: handleQueueAnimEnd,
  } = useSheetDrag(() => setQueueOpen(false));
  useLockBodyScroll(queueMounted);
  const { route, isNative } = useAudioRoute();
  const track = useNowPlayingTrack(
    current,
    isPlaying && status === "connected",
    { syncMetadata: true }
  );
  const currentRoute = ROUTE_CONFIG[route] || ROUTE_CONFIG.speaker;
  const RouteIcon = currentRoute.icon;

  // Queue to display in modal
  const queue = useMemo(() => {
    if (playlist && playlist.length > 1) return playlist;
    return allStations || [];
  }, [playlist, allStations]);

  useEffect(() => {
    if (!queueOpen) return;
    return registerModal(() => setQueueOpen(false));
  }, [queueOpen]);

  useEffect(() => {
    if (!queueOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setQueueOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [queueOpen]);

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
  const formattedElapsed = `${String(Math.floor(recordElapsed / 60)).padStart(
    2,
    "0"
  )}:${String(recordElapsed % 60).padStart(2, "0")}`;


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
            {/* Master Transport & Volume Panel */}
            <div className="rounded-panel border-3 border-ink bg-panel p-5 shadow-hard sm:p-6">
              <h2 className="mb-4 font-fredoka text-lg font-bold uppercase tracking-wider text-ink">
                Master Control Deck
              </h2>

              {/* Transport Buttons: Prev, Play/Pause, Next */}
              <div className="grid grid-cols-[1fr_2.5fr_1fr] items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={prev}
                  disabled={queue.length <= 1}
                  aria-label="Previous station"
                  className="flex h-13 items-center justify-center rounded-pill border-2 border-ink bg-cream font-mono text-xs font-bold uppercase tracking-wider text-ink shadow-hard-sm transition-transform duration-tactile ease-spring hover:-translate-y-0.5 hover:shadow-hard active:translate-y-0 disabled:opacity-30"
                >
                  <SkipBack className="h-5 w-5" strokeWidth={2.5} />
                </button>

                <button
                  type="button"
                  onClick={toggle}
                  style={{ backgroundColor: live ? "#1B1A17" : accent, color: live ? "#FAF6EE" : ink }}
                  className="flex h-14 items-center justify-center gap-2.5 rounded-pill border-3 border-ink font-fredoka text-base font-bold uppercase tracking-wider shadow-hard transition-transform duration-tactile ease-spring hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-x-0.5 active:translate-y-0.5 sm:text-lg"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="h-6 w-6" strokeWidth={2.5} />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-6 w-6 ml-0.5" strokeWidth={2.5} />
                      <span>Transmit</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={next}
                  disabled={queue.length <= 1}
                  aria-label="Next station"
                  className="flex h-13 items-center justify-center rounded-pill border-2 border-ink bg-cream font-mono text-xs font-bold uppercase tracking-wider text-ink shadow-hard-sm transition-transform duration-tactile ease-spring hover:-translate-y-0.5 hover:shadow-hard active:translate-y-0 disabled:opacity-30"
                >
                  <SkipForward className="h-5 w-5" strokeWidth={2.5} />
                </button>
              </div>

              {/* Record Broadcast Button */}
              <div className="mt-3.5">
                <button
                  type="button"
                  onClick={recording ? stopRecording : startRecording}
                  disabled={!canRecord && !recording}
                  title={
                    recording
                      ? "Stop recording"
                      : !live
                      ? "Transmit live broadcast to record"
                      : !recordStream
                      ? "Stream lacks CORS headers, cannot record"
                      : "Record station broadcast"
                  }
                  className={`flex h-12 w-full items-center justify-between rounded-pill border-2 border-ink px-4 font-mono text-xs font-bold uppercase tracking-wider shadow-hard-sm transition-all duration-tactile ease-spring ${
                    recording
                      ? "bg-[#FF4D4D] text-cream -translate-y-0.5 shadow-hard animate-pulse"
                      : !canRecord
                      ? "bg-panel-inset text-ink/40 cursor-not-allowed opacity-60"
                      : "bg-cream text-ink hover:-translate-y-0.5 hover:shadow-hard active:translate-y-0"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Circle
                      className={`h-4 w-4 ${
                        recording
                          ? "fill-cream text-cream animate-ping"
                          : canRecord
                          ? "fill-[#FF4D4D] text-[#FF4D4D]"
                          : "text-ink/40"
                      }`}
                      strokeWidth={2.5}
                    />
                    <span>{recording ? "Recording Broadcast" : "Record Station"}</span>
                  </div>

                  {recording ? (
                    <span className="font-mono text-xs font-black tracking-widest bg-ink/30 px-2.5 py-0.5 rounded-pill text-cream">
                      {formattedElapsed}
                    </span>
                  ) : (
                    <span className="font-mono text-[10px] text-ink-muted">
                      {!live ? "OFFLINE" : !recordStream ? "NO CORS" : "READY"}
                    </span>
                  )}
                </button>

                {/* Short hint when disabled */}
                {!recording && (!live || !recordStream) && (
                  <p className="mt-1 px-1 font-mono text-[10px] text-ink-muted">
                    {!live
                      ? "* Start live transmission to enable recording."
                      : "* Station lacks CORS audio headers and cannot be recorded."}
                  </p>
                )}
              </div>

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

              {/* Audio Route Output Indicator */}
              {isNative && (
                <div className="mt-3 flex items-center justify-between font-mono text-xs font-bold uppercase">
                  <span className="tracking-wider text-ink">Output</span>
                  <div className="inline-flex items-center gap-1.5 rounded-chunky border-2 border-ink bg-panel-inset px-2.5 py-1 text-ink">
                    <RouteIcon className="h-3.5 w-3.5" strokeWidth={2.5} />
                    <span>{currentRoute.label}</span>
                  </div>
                </div>
              )}

              {/* Quick Actions: Random dial & Favorite */}
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRandomSpin}
                  className="flex flex-1 items-center justify-center gap-2 rounded-pill border-2 border-ink bg-cream py-2 font-mono text-xs font-bold uppercase tracking-wider text-ink shadow-hard-sm transition-transform duration-tactile hover:-translate-y-0.5 hover:shadow-hard active:translate-y-0"
                >
                  <Shuffle className="h-3.5 w-3.5" strokeWidth={2.5} />
                  <span>Random Frequency</span>
                </button>
              </div>
            </div>

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
      {queueMounted &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Up Next Queue"
            className={`fixed inset-0 z-[100] flex items-end justify-center ${
              queueClosing ? "pointer-events-none" : ""
            }`}
          >
            {/* Backdrop */}
            <div
              className={`absolute inset-0 bg-ink/50 backdrop-blur-sm ${
                queueClosing ? "animate-backdrop-out" : "animate-backdrop-in"
              }`}
              onClick={() => setQueueOpen(false)}
              aria-hidden="true"
            />

            {/* Sheet */}
            <div
              ref={queueSheetRef}
              onAnimationEnd={handleQueueAnimEnd}
              className={`relative w-full max-w-lg max-h-[75vh] flex flex-col overflow-hidden rounded-t-panel border-t-3 border-x-3 border-ink bg-cream shadow-hard-lg pb-[max(1rem,env(safe-area-inset-bottom))] ${
                queueClosing ? "animate-sheet-out" : queueHasEntered ? "" : "animate-sheet-in"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Handle element (drag notch plus header row) */}
              <div ref={queueHandleRef} style={{ touchAction: "none" }} className="select-none">
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
                    onClick={() => setQueueOpen(false)}
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
                        play(s, queue);
                        setQueueOpen(false);
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
        )}
    </div>
  );
}