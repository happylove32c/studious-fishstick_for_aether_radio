import { useEffect, useRef, useCallback, useState } from "react";
import { Link } from "react-router-dom";
import {
  Heart,
  Pause,
  Play,
  Radio,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import Header from "../components/Header";
import { usePlayer } from "../context/usePlayer";
import { getGenreColor, readableOn } from "../utils/genreColors";

// ---------------------------------------------------------------------------
// Theme constants tuned for cream cartoon UI
// ---------------------------------------------------------------------------

const AMBER = "#F59E0B";
const RED = "#EF4444";
const IDLE = "#57534E";

const PANEL =
  "rounded-panel border-3 border-ink bg-panel p-4 sm:p-6 lg:p-7 shadow-hard";

// ---------------------------------------------------------------------------
// Stable frequency derivation
// ---------------------------------------------------------------------------

function hashToFreq(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  const norm = ((h >>> 0) % 2001) / 100; // 0.00 - 20.00
  return 88.0 + norm; // 88.0 - 108.0
}

function getFrequency(station) {
  if (station?.frequency) return Number(station.frequency);
  const seed = station?._id || station?.name || "unknown";
  return Math.round(hashToFreq(seed) * 10) / 10;
}

// ---------------------------------------------------------------------------
// Tuning ruler restyled for cream cartoon UI
// ---------------------------------------------------------------------------

const TICKS = Array.from({ length: 41 }, (_, i) => i); // 88.0 .. 108.0

function TuningRuler({ pct, live, accent }) {
  const needle = live ? accent : "#1B1A17";

  return (
    <div className="mx-2 sm:mx-4 mt-2">
      <div className="relative h-9 border-b-2 border-ink pb-1">
        {TICKS.map((i) => (
          <span
            key={i}
            className={`absolute bottom-0 -translate-x-1/2 ${
              i % 4 === 0
                ? "h-5 w-0.5 bg-ink"
                : "h-2.5 w-[1px] bg-ink/30"
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

      <div className="relative mt-2 h-4 font-mono text-[11px] font-bold text-ink-muted">
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
// (Canvas logic and audio analysis logic untouched)
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
    <div className="relative min-h-[48px] flex-1">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block h-full w-full"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Info row component
// ---------------------------------------------------------------------------

function InfoRow({ label, children, title, className = "flex" }) {
  return (
    <div
      className={`${className} items-center justify-between gap-4 border-b-2 border-panel-inset py-2.5 last:border-b-0`}
    >
      <span className="label font-bold text-ink-muted shrink-0">{label}</span>
      <span
        className="truncate text-right font-mono text-xs font-bold uppercase tracking-wider text-ink"
        title={title}
      >
        {children}
      </span>
    </div>
  );
}

const pad = (n) => String(n).padStart(2, "0");

// ---------------------------------------------------------------------------
// Hero Now Playing Page
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
    format,
    playlist,
    index,
    next,
    prev,
    isFavorite,
    toggleFavorite,
    analyserRef,
  } = usePlayer();

  const [eqMode, setEqMode] = useState("idle");

  const handleRetry = useCallback(() => {
    if (current) play(current, playlist);
  }, [current, play, playlist]);

  // -------------------------------------------------------------------------
  // Tactile Empty State
  // -------------------------------------------------------------------------
  if (!current) {
    return (
      <div className="min-h-screen bg-cream font-jetbrains text-ink">
        <Header />
        <main className="mx-auto flex max-w-xl flex-col items-center px-4 py-16 text-center sm:py-24">
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-panel border-3 border-ink bg-panel shadow-hard-lg">
            <Radio className="h-12 w-12 text-ink" strokeWidth={2.5} />
          </div>

          <p className="label font-bold uppercase text-ink-muted">
            Now tuned
          </p>

          <h1 className="mt-2 font-fredoka text-4xl font-bold uppercase leading-tight sm:text-6xl text-ink">
            No signal
          </h1>

          <p className="mt-3 max-w-sm font-mono text-xs font-medium text-ink-muted sm:text-sm">
            Pick a station on the radio dial to start transmitting.
          </p>

          <Link
            to="/"
            className="mt-8 inline-flex items-center justify-center rounded-pill border-3 border-ink bg-[#FFD166] px-8 py-3.5 font-fredoka text-base font-bold uppercase tracking-wide text-ink shadow-hard transition-transform duration-tactile ease-spring hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink focus-visible:ring-offset-2"
          >
            Browse stations
          </Link>
        </main>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Active Station Data
  // -------------------------------------------------------------------------
  const genre = current.genre;
  const backTo = genre ? `/genre/${encodeURIComponent(genre)}` : "/";

  const freq = getFrequency(current);
  const freqStr = freq.toFixed(1);
  const tunerPct = Math.min(Math.max(((freq - 88) / 20) * 100, 0), 100);

  const live = isPlaying && status === "connected";
  const fav = isFavorite(current);
  const stationIdx = index >= 0 ? index + 1 : 0;
  const stationCount = playlist.length;
  const shownVolume = muted ? 0 : volume;

  const accent = getGenreColor(current.genre);
  const ink = readableOn(accent);

  const statusLabel =
    {
      idle: "Idle",
      connecting: "Connecting",
      connected: "Connected",
      error: "Error",
    }[status] || "Idle";

  const statusColour =
    {
      idle: IDLE,
      connecting: AMBER,
      connected: accent,
      error: RED,
    }[status] || IDLE;

  const eqLabel = { live: "Live signal", sim: "Simulated", idle: "Silent" }[
    eqMode
  ];
  const eqLabelColour =
    eqMode === "live" ? accent : eqMode === "sim" ? AMBER : IDLE;

  return (
    <div
      style={{
        "--g": accent,
        "--gb": `${accent}99`,
        "--gt": ink,
      }}
      className="flex h-screen h-dvh flex-col overflow-hidden bg-cream font-jetbrains text-ink"
    >
      <div className="shrink-0">
        <div className="mx-auto w-full max-w-[1600px]">
          <Header />
        </div>
      </div>

      {/* Main one-screen layout */}
      <main className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col overflow-y-auto px-4 py-3 sm:px-6 md:px-10 md:py-4">
        {/* Top Breadcrumb & Station Position */}
        <div className="mb-2 flex items-center justify-between gap-4">
          <Link
            to={backTo}
            className="flex items-center gap-1.5 rounded-pill border-2 border-ink bg-panel px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider text-ink shadow-hard-sm transition-transform duration-tactile ease-spring hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink focus-visible:ring-offset-2"
          >
            ← Back
          </Link>
          <p className="rounded-pill border-2 border-ink bg-panel px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider text-ink shadow-hard-sm">
            Now tuned · {pad(stationIdx)} / {pad(stationCount)}
          </p>
        </div>

        {/* Hero Station Name Header */}
        <h1
          className="truncate font-fredoka text-3xl font-bold uppercase leading-tight text-ink sm:text-5xl md:text-6xl"
          title={current.name}
        >
          {current.name}
        </h1>

        {/* Station Subtitle Details */}
        <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-ink-muted">
          <span
            className="rounded-pill border-2 border-ink px-2.5 py-0.5 text-ink shadow-hard-sm"
            style={{ backgroundColor: accent }}
          >
            {genre}
          </span>
          <span>·</span>
          <span>{freqStr} MHz</span>
          <span>·</span>
          <span
            className="rounded-pill border-2 border-ink bg-panel px-2.5 py-0.5 shadow-hard-sm"
            style={{ color: statusColour === RED ? "#B91C1C" : statusColour === AMBER ? "#B45309" : "#1B1A17" }}
          >
            {statusLabel}
          </span>
        </div>

        {/* Two-Column Responsive Grid */}
        <div className="mt-3 grid flex-1 grid-cols-1 grid-rows-[minmax(min-content,1fr)_auto] gap-3 md:mt-4 md:gap-5 lg:grid-cols-12 lg:grid-rows-[minmax(min-content,1fr)]">
          {/* ================= LEFT: Signal & Ruler ================= */}
          <div className="flex flex-col gap-3 lg:col-span-7 lg:gap-4">
            {/* Frequency Tuning Dial Card */}
            <div className={PANEL}>
              <div className="flex items-start justify-between">
                <span className="label font-bold uppercase text-ink-muted">Frequency</span>
                <div className="flex items-center gap-2 rounded-pill border-2 border-ink bg-cream px-2.5 py-0.5 shadow-hard-sm">
                  <span
                    className={`h-2.5 w-2.5 rounded-full border border-ink ${live ? "animate-pulse" : ""}`}
                    style={{ backgroundColor: live ? accent : IDLE }}
                  />
                  <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-ink">
                    {live ? "On air" : "Off air"}
                  </span>
                </div>
              </div>

              <div className="my-2 flex items-baseline gap-3">
                <span className="font-mono text-5xl font-black leading-none tracking-tight sm:text-6xl lg:text-7xl text-ink">
                  {freqStr}
                </span>
                <span className="font-fredoka text-lg font-bold uppercase tracking-wider text-ink-muted">
                  MHz
                </span>
              </div>

              <TuningRuler pct={tunerPct} live={live} accent={accent} />
            </div>

            {/* Equalizer Spectrogram Card */}
            <div className={`${PANEL} flex min-h-[110px] flex-1 flex-col`}>
              <div className="mb-2 flex items-center justify-between">
                <span className="label font-bold uppercase text-ink-muted">Spectrogram</span>
                <div
                  className="rounded-pill border-2 border-ink bg-cream px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider shadow-hard-sm"
                  style={{ color: eqLabelColour === RED ? "#B91C1C" : eqLabelColour === AMBER ? "#B45309" : "#1B1A17" }}
                >
                  {eqLabel}
                </div>
              </div>
              <Equalizer
                active={live}
                analyserRef={analyserRef}
                color={live ? accent : IDLE}
                onMode={setEqMode}
              />
            </div>
          </div>

          {/* ================= RIGHT: Controls & Stream Info ================= */}
          <div className="flex flex-col gap-3 lg:col-span-5 lg:gap-4">
            {/* Transport & Volume Panel */}
            <div className={PANEL}>
              {/* Transport Buttons */}
              <div className="grid grid-cols-[1fr_2fr_1fr] gap-2 sm:gap-3">
                {/* Prev */}
                <button
                  onClick={prev}
                  disabled={stationCount <= 1}
                  aria-label="Previous station"
                  className="flex h-12 items-center justify-center gap-2 rounded-pill border-2 border-ink bg-cream font-mono text-xs font-bold uppercase tracking-wider text-ink shadow-hard-sm transition-transform duration-tactile ease-spring hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-hard-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink focus-visible:ring-offset-2"
                >
                  <SkipBack className="h-4 w-4" strokeWidth={2.5} />
                  <span className="hidden sm:inline">Prev</span>
                </button>

                {/* Play / Pause */}
                <button
                  onClick={toggle}
                  className="flex h-12 items-center justify-center gap-2.5 rounded-pill border-3 border-ink bg-[color:var(--g)] text-[color:var(--gt)] font-fredoka text-sm font-bold uppercase tracking-wider shadow-hard transition-transform duration-tactile ease-spring hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink focus-visible:ring-offset-2"
                  aria-label={isPlaying ? "Pause playback" : "Start playback"}
                >
                  {isPlaying ? (
                    <Pause className="h-5 w-5" strokeWidth={2.5} />
                  ) : (
                    <Play className="h-5 w-5 ml-0.5" strokeWidth={2.5} />
                  )}
                  <span>{isPlaying ? "Pause" : "Play"}</span>
                </button>

                {/* Next */}
                <button
                  onClick={next}
                  disabled={stationCount <= 1}
                  aria-label="Next station"
                  className="flex h-12 items-center justify-center gap-2 rounded-pill border-2 border-ink bg-cream font-mono text-xs font-bold uppercase tracking-wider text-ink shadow-hard-sm transition-transform duration-tactile ease-spring hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-hard-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink focus-visible:ring-offset-2"
                >
                  <span className="hidden sm:inline">Next</span>
                  <SkipForward className="h-4 w-4" strokeWidth={2.5} />
                </button>
              </div>

              {/* Volume & Favorite Row */}
              <div className="mt-4 flex items-center gap-3 border-t-2 border-panel-inset pt-3.5">
                <button
                  onClick={toggleMute}
                  aria-label={muted ? "Unmute" : "Mute"}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill border-2 border-ink bg-cream text-ink shadow-hard-sm transition-transform duration-tactile ease-spring hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard active:translate-x-0.5 active:translate-y-0.5 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink focus-visible:ring-offset-2"
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
                  aria-label="Volume"
                  className="np-slider h-2 min-w-0 flex-1 cursor-pointer appearance-none rounded-full border-2 border-ink outline-none"
                  style={{
                    background: `linear-gradient(to right, ${accent} ${
                      shownVolume * 100
                    }%, #F0EAE1 ${shownVolume * 100}%)`,
                  }}
                />

                <span className="w-11 shrink-0 text-right font-mono text-xs font-bold text-ink">
                  {Math.round(shownVolume * 100)}%
                </span>

                <button
                  onClick={() => toggleFavorite(current)}
                  aria-pressed={fav}
                  aria-label={fav ? "Remove from favorites" : "Add to favorites"}
                  title={fav ? "Remove from favorites" : "Add to favorites"}
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-pill border-2 border-ink shadow-hard-sm transition-transform duration-tactile ease-spring hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink focus-visible:ring-offset-2 ${
                    fav
                      ? "bg-status-red text-cream"
                      : "bg-cream text-ink hover:bg-panel"
                  }`}
                >
                  <Heart
                    className={`h-4 w-4 ${fav ? "fill-current" : ""}`}
                    strokeWidth={2.5}
                  />
                </button>
              </div>
            </div>

            {/* Error Notification Banner */}
            {error && (
              <div className="flex items-center justify-between gap-3 rounded-chunky border-2 border-status-red-text bg-[#FEE2E2] p-3 text-status-red-text shadow-hard-sm">
                <span className="font-mono text-xs font-bold uppercase tracking-wider">
                  Signal error: {error}
                </span>
                <button
                  onClick={handleRetry}
                  className="shrink-0 rounded-pill border-2 border-status-red-text bg-cream px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider hover:bg-status-red hover:text-cream transition-colors shadow-hard-sm"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Stream Info Specs Card */}
            <div className={`${PANEL} flex flex-col justify-center lg:flex-1`}>
              <InfoRow label="Status">
                <span
                  className="font-bold"
                  style={{ color: statusColour === RED ? "#B91C1C" : statusColour === AMBER ? "#B45309" : "#1B1A17" }}
                >
                  {statusLabel}
                </span>
              </InfoRow>
              <InfoRow
                label="Stream"
                title={current.streamUrl}
                className="hidden sm:flex"
              >
                {current.streamUrl}
              </InfoRow>
              <InfoRow label="Format">{format || "AAC / MP3"}</InfoRow>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}