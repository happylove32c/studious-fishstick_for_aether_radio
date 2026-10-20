import { useEffect, useRef, useCallback, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronDown,
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
import { useGoBack } from "../hooks/useGoBack";
import { usePlayer } from "../context/usePlayer";
import { getGenreColor, readableOn } from "../utils/genreColors";

// ---------------------------------------------------------------------------
// Theme constants tuned for cream cartoon UI
// ---------------------------------------------------------------------------

const IDLE = "#57534E";
const noop = () => {};

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
    playlist,
    next,
    prev,
    isFavorite,
    toggleFavorite,
    analyserRef,
  } = usePlayer();

  const goBack = useGoBack();
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      goBack();
      return;
    }
    setIsClosing(true);
  };

  const handleAnimationEnd = (e) => {
    if (e.target === e.currentTarget && isClosing) {
      goBack();
    }
  };

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

  const freq = getFrequency(current);
  const freqStr = freq.toFixed(1);
  const tunerPct = Math.min(Math.max(((freq - 88) / 20) * 100, 0), 100);

  const live = isPlaying && status === "connected";
  const fav = isFavorite(current);
  const stationCount = playlist.length;
  const shownVolume = muted ? 0 : volume;

  const accent = getGenreColor(current.genre);
  const ink = readableOn(accent);

  let statusText = "Paused";
  let statusDotClass = "bg-ink-muted";

  if (error || status === "error") {
    statusText = "Error";
    statusDotClass = "bg-status-red";
  } else if (status === "connecting") {
    statusText = "Connecting";
    statusDotClass = "bg-status-amber animate-pulse";
  } else if (isPlaying && status === "connected") {
    statusText = "Live";
    statusDotClass = "bg-status-green animate-pulse";
  }

  return (
    <div
      style={{
        "--g": accent,
        "--gb": `${accent}99`,
        "--gt": ink,
      }}
      onAnimationEnd={handleAnimationEnd}
      className={`flex h-screen h-dvh flex-col justify-between overflow-hidden bg-cream font-jetbrains text-ink ${
        isClosing ? "animate-np-down" : "animate-np-up"
      }`}
    >
      <main className="mx-auto flex h-full min-h-0 w-full max-w-xl flex-1 flex-col justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-6 sm:py-5">
        {/* 1. Top row: ChevronDown collapse button + favorite heart button */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleClose}
            aria-label="Collapse now playing"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill border-2 border-ink bg-panel text-ink shadow-hard-sm transition-transform duration-tactile ease-spring hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard active:translate-x-0.5 active:translate-y-0.5 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink focus-visible:ring-offset-2"
          >
            <ChevronDown className="h-5 w-5" strokeWidth={2.5} />
          </button>

          <button
            type="button"
            onClick={() => toggleFavorite(current)}
            aria-pressed={fav}
            aria-label={fav ? "Remove from favorites" : "Add to favorites"}
            title={fav ? "Remove from favorites" : "Add to favorites"}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-pill border-2 border-ink shadow-hard-sm transition-transform duration-tactile ease-spring hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink focus-visible:ring-offset-2 ${
              fav
                ? "bg-status-red text-cream"
                : "bg-panel text-ink hover:bg-cream"
            }`}
          >
            <Heart
              className={`h-4 w-4 ${fav ? "fill-current" : ""}`}
              strokeWidth={2.5}
            />
          </button>
        </div>

        {/* 2. Station name & Details */}
        <div>
          <h1
            className="truncate font-fredoka text-2xl font-bold uppercase leading-tight text-ink sm:text-4xl"
            title={current.name}
          >
            {current.name}
          </h1>

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
            <span className="flex items-center gap-1.5 text-ink">
              <span
                className={`h-2.5 w-2.5 rounded-full border border-ink ${statusDotClass}`}
              />
              <span>{statusText}</span>
            </span>
          </div>
        </div>

        {/* 3. One card: Spectrogram + TuningRuler */}
        <div className="flex min-h-[140px] flex-1 flex-col justify-between rounded-panel border-3 border-ink bg-panel p-3.5 sm:p-5 shadow-hard">
          <Equalizer
            active={live}
            analyserRef={analyserRef}
            color={live ? accent : IDLE}
            onMode={noop}
          />
          <TuningRuler pct={tunerPct} live={live} accent={accent} />
        </div>

        {/* 4. Controls Card */}
        <div className="rounded-panel border-3 border-ink bg-panel p-3.5 sm:p-5 shadow-hard">
          {/* Transport Buttons */}
          <div className="grid grid-cols-[1fr_2fr_1fr] gap-2 sm:gap-3">
            <button
              onClick={prev}
              disabled={stationCount <= 1}
              aria-label="Previous station"
              className="flex h-11 items-center justify-center gap-2 rounded-pill border-2 border-ink bg-cream font-mono text-xs font-bold uppercase tracking-wider text-ink shadow-hard-sm transition-transform duration-tactile ease-spring hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-hard-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink focus-visible:ring-offset-2"
            >
              <SkipBack className="h-4 w-4" strokeWidth={2.5} />
              <span className="hidden sm:inline">Prev</span>
            </button>

            <button
              onClick={toggle}
              className="flex h-11 items-center justify-center gap-2.5 rounded-pill border-3 border-ink bg-[color:var(--g)] text-[color:var(--gt)] font-fredoka text-sm font-bold uppercase tracking-wider shadow-hard transition-transform duration-tactile ease-spring hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink focus-visible:ring-offset-2"
              aria-label={isPlaying ? "Pause playback" : "Start playback"}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" strokeWidth={2.5} />
              ) : (
                <Play className="h-5 w-5 ml-0.5" strokeWidth={2.5} />
              )}
              <span>{isPlaying ? "Pause" : "Play"}</span>
            </button>

            <button
              onClick={next}
              disabled={stationCount <= 1}
              aria-label="Next station"
              className="flex h-11 items-center justify-center gap-2 rounded-pill border-2 border-ink bg-cream font-mono text-xs font-bold uppercase tracking-wider text-ink shadow-hard-sm transition-transform duration-tactile ease-spring hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-hard-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink focus-visible:ring-offset-2"
            >
              <span className="hidden sm:inline">Next</span>
              <SkipForward className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </div>

          {/* Volume Row */}
          <div className="mt-3 flex items-center gap-2.5 border-t-2 border-panel-inset pt-3">
            <button
              onClick={toggleMute}
              aria-label={muted ? "Unmute" : "Mute"}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill border-2 border-ink bg-cream text-ink shadow-hard-sm transition-transform duration-tactile ease-spring hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard active:translate-x-0.5 active:translate-y-0.5 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink focus-visible:ring-offset-2"
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

            <span className="w-10 shrink-0 text-right font-mono text-xs font-bold text-ink">
              {Math.round(shownVolume * 100)}%
            </span>
          </div>
        </div>

        {/* 5. Error Banner (only when error) */}
        {error && (
          <div className="flex items-center justify-between gap-3 rounded-chunky border-2 border-status-red-text bg-[#FEE2E2] p-2.5 text-status-red-text shadow-hard-sm">
            <span className="truncate font-mono text-xs font-bold uppercase tracking-wider">
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
      </main>
    </div>
  );
}