import { useEffect, useRef, useCallback, useState } from "react";
import { Link } from "react-router-dom";
import {
  Heart,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import Header from "../components/Header";
import { usePlayer } from "../context/usePlayer";
import { getGenreColor, readableOn } from "../utils/genreColors";

// ---------------------------------------------------------------------------
// Theme: the page takes its accent from the current station's genre (same
// colours as the genre cards). The root element exposes it as CSS variables:
//   --g  genre colour      --gb  genre colour at 40% (resting borders)
//   --gt text colour that is readable ON the genre colour
// Amber (connecting) and red (error) stay fixed so problems always look
// like problems, whatever the genre colour is.
// ---------------------------------------------------------------------------

const AMBER = "#facc15";
const RED = "#ef4444";
const IDLE = "rgba(255,255,255,0.35)";

const LABEL = "text-[10px] uppercase tracking-[0.3em] text-white/50";
const PANEL =
  "border border-[color:var(--gb)] bg-white/[0.04] p-4 sm:p-6 lg:p-7";

// ---------------------------------------------------------------------------
// Stable "frequency" from station name / _id (cosmetic, not real signal data)
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
// Tuning ruler: ticks every 0.5 MHz, major every 2, labelled every 4
// ---------------------------------------------------------------------------

const TICKS = Array.from({ length: 41 }, (_, i) => i); // 88.0 .. 108.0

function TuningRuler({ pct, live, accent }) {
  const needle = live ? accent : "#ffffff";

  return (
    <div className="mx-3 sm:mx-4">
      <div className="relative h-8">
        {TICKS.map((i) => (
          <span
            key={i}
            className={`absolute bottom-0 w-px ${
              i % 4 === 0 ? "h-4 bg-white/50" : "h-2 bg-white/20"
            }`}
            style={{ left: `${(i / 40) * 100}%` }}
          />
        ))}
        <span
          className="absolute bottom-0 top-0 w-0.5 -translate-x-1/2 transition-[left] duration-500"
          style={{ left: `${pct}%`, backgroundColor: needle }}
        />
      </div>

      <div className="relative mt-1.5 h-4 text-[11px] text-white/60">
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
// Equalizer
//
// Reads real frequency data from the analyser when the player has one.
// If the stream can't be analysed (no CORS headers) it falls back to a
// simulated animation and reports that via onMode, so the UI can say so.
// When nothing is playing, the loop settles and STOPS (no animation, no CPU).
// ---------------------------------------------------------------------------

const BAR_COUNT = 24;
const FLOOR = 3;

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
    const tilt = 1 + (i / BAR_COUNT) * 0.7; // highs carry less energy
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

      const gap = 4;
      const barW = Math.max(3, (w - (BAR_COUNT - 1) * gap) / BAR_COUNT);
      ctx.fillStyle = color;

      heightsRef.current.forEach((bh, i) => {
        const hh = Math.min(bh, h);
        ctx.fillRect(
          Math.floor(i * (barW + gap)),
          Math.floor(h - hh),
          Math.floor(barW),
          Math.ceil(hh)
        );
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
        paint(); // resizing clears the canvas; redraw even if the loop is idle
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

        // Analyser present but never produced a single non-zero sample in
        // ~3s: the browser is feeding it silence. Treat as unavailable.
        if (heard || silentFrames < 180) levels = bandLevels(data, bands);
      }

      setMode(levels ? "live" : active ? "sim" : "idle");

      const heights = heightsRef.current;
      let moving = false;

      for (let i = 0; i < BAR_COUNT; i++) {
        let target = FLOOR;

        if (active) {
          if (levels) {
            target = Math.max(FLOOR, levels[i] * h * 0.95);
          } else {
            const t = time * 0.0012;
            const a = Math.sin(t * 1.5 + i * 0.4);
            const b = Math.cos(t * 2.1 - i * 0.3);
            const c = Math.sin(t * 3.3 + i * 0.7);
            const norm = (a * 0.4 + b * 0.4 + c * 0.2 + 1) / 2;
            target = Math.max(6, norm * (h * 0.85));
          }
        }

        // fast attack so beats hit, slower release so bars fall smoothly
        const diff = target - heights[i];
        heights[i] += diff * (diff > 0 ? 0.6 : 0.15);
        if (heights[i] > FLOOR + 0.5) moving = true;
      }

      paint();

      // Keep looping only while playing or while bars are still falling.
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
// Small pieces
// ---------------------------------------------------------------------------

function InfoRow({ label, children, title, className = "flex" }) {
  return (
    <div
      className={`${className} items-center justify-between gap-4 border-b border-white/10 py-2.5 last:border-b-0`}
    >
      <span className={`${LABEL} shrink-0`}>{label}</span>
      <span
        className="truncate text-right text-[11px] uppercase tracking-[0.15em] text-white/80"
        title={title}
      >
        {children}
      </span>
    </div>
  );
}

const pad = (n) => String(n).padStart(2, "0");

const btnBase =
  "flex items-center justify-center gap-2 border border-[color:var(--gb)] bg-white/[0.04] py-4 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:border-[color:var(--g)] hover:bg-[color:var(--g)] hover:text-[color:var(--gt)] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-[color:var(--gb)] disabled:hover:bg-white/[0.04] disabled:hover:text-white";

// ---------------------------------------------------------------------------
// Page
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

  const [eqMode, setEqMode] = useState("idle"); // idle | live | sim

  const handleRetry = useCallback(() => {
    if (current) play(current, playlist);
  }, [current, play, playlist]);

  // -------------------------------------------------------------------------
  // Empty state
  // -------------------------------------------------------------------------
  if (!current) {
    return (
      <div className="min-h-screen bg-black font-jetbrains">
        <Header />
        <section className="px-4 py-10 sm:px-6 md:px-10 md:py-16">
          <p className="mb-3 text-[10px] uppercase tracking-[0.4em] text-white/40">
            Now tuned
          </p>
          <h1 className="text-5xl font-black uppercase leading-none tracking-[-0.06em] text-white md:text-8xl">
            No signal
          </h1>
          <p className="mt-4 text-[11px] uppercase tracking-[0.35em] text-white/60">
            Pick a station to start transmitting
          </p>
          <Link
            to="/"
            className="mt-10 inline-block border border-white/15 bg-white/[0.04] px-6 py-3 text-[11px] font-bold uppercase tracking-[0.25em] text-white transition-colors hover:border-white/40 hover:bg-white/[0.07]"
          >
            Browse stations
          </Link>
        </section>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Derived values
  // -------------------------------------------------------------------------
  const genre = current.genre || "Unknown";
  const backTo = current.genre
    ? `/genre/${encodeURIComponent(current.genre)}`
    : "/";

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
        "--gb": `${accent}66`,
        "--gt": ink,
        backgroundColor: "#000",
        backgroundImage: `radial-gradient(ellipse 80% 50% at 50% 0%, ${accent}22, transparent 70%)`,
      }}
      className="flex h-screen h-dvh flex-col overflow-hidden font-jetbrains text-white"
    >
      <div className="shrink-0">
        <div className="mx-auto w-full max-w-[1600px]">
          <Header />
        </div>
      </div>

      {/* Scrolls only as a last resort on very short screens */}
      <section className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col overflow-y-auto px-4 py-3 sm:px-6 md:px-10 md:py-5">
        <div className="mb-2 flex items-center justify-between gap-4 md:mb-3">
          <Link
            to={backTo}
            className="shrink-0 text-[11px] uppercase tracking-[0.35em] text-white/60 transition-colors hover:text-[color:var(--g)]"
          >
            ← Back
          </Link>
          <p className="truncate text-[10px] uppercase tracking-[0.35em] text-white/50">
            Now tuned · {pad(stationIdx)} / {pad(stationCount)}
          </p>
        </div>

        <h1
          className="truncate text-4xl font-black uppercase leading-[1.05] tracking-[-0.06em] text-white sm:text-5xl md:text-6xl lg:text-7xl"
          title={current.name}
        >
          {current.name}
        </h1>

        <p className="mt-2 text-[11px] uppercase tracking-[0.35em] text-white/60">
          <span className="font-bold" style={{ color: accent }}>
            {genre}
          </span>{" "}
          · {freqStr} MHz ·{" "}
          <span className="font-bold" style={{ color: statusColour }}>
            {statusLabel}
          </span>
        </p>

        {/* Both columns stretch to the same height */}
        <div className="mt-3 grid flex-1 grid-cols-1 grid-rows-[minmax(min-content,1fr)_auto] gap-4 md:mt-5 lg:grid-cols-12 lg:grid-rows-[minmax(min-content,1fr)] lg:gap-5">
          {/* ================= LEFT: signal ================= */}
          <div className="flex flex-col gap-4 lg:col-span-7 lg:gap-5">
            {/* Frequency */}
            <div className={PANEL}>
              <div className="flex items-start justify-between">
                <p className={LABEL}>Frequency</p>
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 ${live ? "animate-pulse" : ""}`}
                    style={{ backgroundColor: live ? accent : IDLE }}
                  />
                  <span className="text-[10px] uppercase tracking-[0.25em] text-white/60">
                    {live ? "On air" : "Off air"}
                  </span>
                </div>
              </div>

              <div className="mb-4 mt-2 flex items-baseline gap-3">
                <span
                  className="text-5xl font-black leading-none tracking-[-0.06em] transition-colors sm:text-6xl lg:text-7xl"
                  style={{ color: live ? accent : "#ffffff" }}
                >
                  {freqStr}
                </span>
                <span className="text-sm font-bold uppercase tracking-[0.25em] text-white/60">
                  MHz
                </span>
              </div>

              <TuningRuler pct={tunerPct} live={live} accent={accent} />
            </div>

            {/* Equalizer: grows to fill whatever height the right column needs */}
            <div className={`${PANEL} flex min-h-[110px] flex-1 flex-col`}>
              <div className="mb-3 flex items-center justify-between">
                <p className={LABEL}>Spectrogram</p>
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.25em]"
                  style={{ color: eqLabelColour }}
                >
                  {eqLabel}
                </p>
              </div>
              <Equalizer
                active={live}
                analyserRef={analyserRef}
                color={live ? accent : IDLE}
                onMode={setEqMode}
              />
            </div>
          </div>

          {/* ================= RIGHT: controls ================= */}
          <div className="flex flex-col gap-4 lg:col-span-5 lg:gap-5">
            <div className={PANEL}>
              {/* Transport */}
              <div className="grid grid-cols-[1fr_2fr_1fr] gap-2.5 sm:gap-3.5">
                <button
                  onClick={prev}
                  disabled={stationCount <= 1}
                  aria-label="Previous station"
                  className={btnBase}
                >
                  <SkipBack className="h-4 w-4" />
                  <span className="hidden sm:inline">Prev</span>
                  <kbd className="hidden border border-current px-1.5 py-0.5 text-[9px] font-bold opacity-60 lg:inline">
                    ⇧P
                  </kbd>
                </button>

                <button
                  onClick={toggle}
                  className="flex items-center justify-center gap-3 bg-[color:var(--g)] py-4 text-xs font-black uppercase tracking-[0.25em] text-[color:var(--gt)] transition-[filter] hover:brightness-110"
                >
                  {isPlaying ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5" />
                  )}
                  {isPlaying ? "Pause" : "Play"}
                  <kbd className="hidden border border-current px-1.5 py-0.5 text-[9px] font-bold opacity-60 lg:inline">
                    Space
                  </kbd>
                </button>

                <button
                  onClick={next}
                  disabled={stationCount <= 1}
                  aria-label="Next station"
                  className={btnBase}
                >
                  <span className="hidden sm:inline">Next</span>
                  <kbd className="hidden border border-current px-1.5 py-0.5 text-[9px] font-bold opacity-60 lg:inline">
                    ⇧N
                  </kbd>
                  <SkipForward className="h-4 w-4" />
                </button>
              </div>

              {/* Volume + favorite in one row */}
              <div className="mt-4 flex items-center gap-3 border-t border-white/10 pt-4">
                <button
                  onClick={toggleMute}
                  aria-label={muted ? "Unmute" : "Mute"}
                  className="shrink-0 text-white/70 transition-colors hover:text-white"
                >
                  {muted ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
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
                  className="np-slider h-1.5 min-w-0 flex-1 cursor-pointer appearance-none outline-none"
                  style={{
                    background: `linear-gradient(to right, ${accent} ${
                      shownVolume * 100
                    }%, rgba(255,255,255,0.2) ${shownVolume * 100}%)`,
                  }}
                />

                <span className="w-10 shrink-0 text-right text-[11px] text-white/70">
                  {Math.round(shownVolume * 100)}%
                </span>

                <button
                  onClick={() => toggleFavorite(current)}
                  aria-pressed={fav}
                  aria-label={fav ? "Remove from favorites" : "Add to favorites"}
                  title={fav ? "Remove from favorites" : "Add to favorites"}
                  className={`flex h-10 w-10 shrink-0 items-center justify-center border transition-colors ${
                    fav
                      ? "border-[color:var(--g)] bg-[color:var(--g)] text-[color:var(--gt)]"
                      : "border-[color:var(--gb)] text-white/70 hover:border-[color:var(--g)] hover:text-white"
                  }`}
                >
                  <Heart className={`h-4 w-4 ${fav ? "fill-current" : ""}`} />
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center justify-between gap-3 border border-red-500/50 bg-red-500/10 p-3">
                <span className="text-[11px] uppercase tracking-[0.2em] text-red-400">
                  Signal error: {error}
                </span>
                <button
                  onClick={handleRetry}
                  className="shrink-0 border border-red-500/50 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-red-400 transition-colors hover:bg-red-500/20"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Stream info: stretches so both columns end on the same line */}
            <div className={`${PANEL} flex flex-col justify-center lg:flex-1`}>
              <InfoRow label="Status">
                <span className="font-bold" style={{ color: statusColour }}>
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
              <InfoRow label="Format">{format}</InfoRow>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}