import { useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Heart,
  Radio,
} from "lucide-react";
import { usePlayer } from "../context/usePlayer";

// ---------------------------------------------------------------------------
// Genre → accent colour map
// ---------------------------------------------------------------------------

const GENRE_COLOURS = {
  News: "#1da1f2",
  Pop: "#e040fb",
  Rock: "#ff5722",
  Jazz: "#ffc107",
  Classical: "#9c27b0",
  "Hip Hop": "#ff9800",
  Electronic: "#00bcd4",
  Country: "#8bc34a",
  "R&B": "#e91e63",
  Reggae: "#4caf50",
  Metal: "#f44336",
  Blues: "#2196f3",
  Folk: "#795548",
  Latin: "#ff6f00",
  Ambient: "#607d8b",
  Dance: "#ce93d8",
  Indie: "#ffab91",
  Soul: "#d4e157",
  Punk: "#ff1744",
  Gospel: "#ffd54f",
  World: "#26a69a",
};

const DEFAULT_ACCENT = "#1da1f2";
const STATUS_GREEN = "#00ff41";

function getAccent(genre) {
  if (!genre) return DEFAULT_ACCENT;
  for (const [key, value] of Object.entries(GENRE_COLOURS)) {
    if (genre.toLowerCase() === key.toLowerCase()) return value;
  }
  return DEFAULT_ACCENT;
}

// ---------------------------------------------------------------------------
// Stable "frequency" from station name / _id
// ---------------------------------------------------------------------------

function hashToFreq(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  const norm = ((h >>> 0) % 2001) / 100; // 0.00 – 20.00
  return 88.0 + norm; // 88.0 – 108.0
}

function getFrequency(station) {
  if (station?.frequency) return Number(station.frequency);
  const seed = station?._id || station?.name || "unknown";
  return Math.round(hashToFreq(seed) * 10) / 10;
}

// ---------------------------------------------------------------------------
// Equalizer bars (canvas)
// ---------------------------------------------------------------------------

function EqualizerCanvas({ isPlaying, accent }) {
  const canvasRef = useRef(null);
  const BAR_COUNT = 22;
  const heightsRef = useRef(new Array(BAR_COUNT).fill(4));
  const dimensionsRef = useRef({ width: 0, height: 0, dpr: 1 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    const updateSize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      if (w === 0 || h === 0) return;

      if (
        dimensionsRef.current.width !== w ||
        dimensionsRef.current.height !== h ||
        dimensionsRef.current.dpr !== dpr
      ) {
        dimensionsRef.current = { width: w, height: h, dpr };
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    };

    updateSize();

    let resizeObserver;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        updateSize();
      });
      resizeObserver.observe(canvas);
    }

    let raf;
    const render = (time) => {
      const { width: w, height: h } = dimensionsRef.current;
      if (w > 0 && h > 0) {
        ctx.clearRect(0, 0, w, h);

        const gap = 6;
        const totalGap = (BAR_COUNT - 1) * gap;
        const barW = Math.max(4, (w - totalGap) / BAR_COUNT);
        const heights = heightsRef.current;

        for (let i = 0; i < BAR_COUNT; i++) {
          let target = 4;

          if (isPlaying) {
            const t = time * 0.0012;
            const w1 = Math.sin(t * 1.5 + i * 0.4);
            const w2 = Math.cos(t * 2.1 - i * 0.3);
            const noise = Math.sin(t * 3.3 + i * 0.7);
            const norm = (w1 * 0.4 + w2 * 0.4 + noise * 0.2 + 1) / 2;
            target = Math.max(6, norm * (h * 0.85));
          }

          heights[i] += (target - heights[i]) * 0.12;

          const x = i * (barW + gap);
          const y = h - heights[i];

          ctx.fillStyle = accent;
          ctx.fillRect(
            Math.floor(x),
            Math.floor(y),
            Math.floor(barW),
            Math.ceil(heights[i])
          );
        }
      }

      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [isPlaying, accent]);

  return (
    <canvas
      ref={canvasRef}
      className="block w-full"
      style={{ height: "120px" }}
    />
  );
}

// ---------------------------------------------------------------------------
// NowPlayingPage
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
  } = usePlayer();

  const navigate = useNavigate();

  const accent = getAccent(current?.genre);
  const freq = current ? getFrequency(current) : 88.0;
  const freqStr = freq.toFixed(1);
  const tunerPct = ((freq - 88) / (108 - 88)) * 100;

  const genre = current?.genre || "UNKNOWN";
  const stationIdx = index >= 0 ? index + 1 : 0;
  const stationCount = playlist.length;
  const pad = (n) => String(n).padStart(2, "0");

  const fav = current ? isFavorite(current) : false;

  const handleRetry = useCallback(() => {
    if (current) play(current, playlist);
  }, [current, play, playlist]);

  // Status display
  const statusLabel = {
    idle: "IDLE",
    connecting: "CONNECTING...",
    connected: "CONNECTED",
    error: "ERROR",
  }[status] || "IDLE";

  const statusColour = {
    idle: "#666",
    connecting: "#facc15",
    connected: STATUS_GREEN,
    error: "#ef4444",
  }[status] || "#666";

  const isLiveActive = status === "connected" && isPlaying;
  const liveDotColor =
    status === "error" ? "#ef4444" : isLiveActive ? STATUS_GREEN : "#666666";

  // -----------------------------------------------------------------------
  // Empty state
  // -----------------------------------------------------------------------
  if (!current) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black font-jetbrains text-white p-6">
        <div className="border border-white/20 bg-[#111] p-10 text-center max-w-md w-full">
          <div className="mx-auto mb-6 h-3 w-3 bg-white/30" />
          <h2 className="text-xl font-bold uppercase tracking-widest mb-3">
            No Signal Locked
          </h2>
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-8 leading-relaxed">
            Select an active frequency from the main directory to initialize live transmission.
          </p>
          <Link
            to="/"
            className="inline-block border border-white/20 px-8 py-3 text-[10px] font-bold uppercase tracking-[0.25em] text-white hover:bg-white hover:text-black transition-colors"
          >
            Explore Stations
          </Link>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Main layout
  // -----------------------------------------------------------------------
  return (
    <div className="min-h-screen flex flex-col bg-black font-jetbrains text-white">
      {/* ---- Top bar ---- */}
      <header className="flex items-center justify-between px-4 py-3 sm:px-6 border-b border-white/10">
        <button
          onClick={() => navigate(current?.genre ? `/genre/${encodeURIComponent(current.genre)}` : "/")}
          className="flex items-center gap-2 border border-white/20 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-white/70 hover:text-white hover:border-white/50 transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          Back
        </button>

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-[10px] uppercase tracking-[0.2em] text-white/40">
            Aether Radio // Now Playing
          </span>
          <span
            className="px-2.5 py-1 text-[10px] uppercase tracking-[0.15em] font-bold text-black"
            style={{ backgroundColor: accent }}
          >
            {genre}
          </span>
        </div>
      </header>

      {/* ---- Body ---- */}
      <main className="flex-1 p-3 sm:p-4 lg:p-5 overflow-auto">
        <div className="flex flex-col gap-3 sm:gap-4 lg:grid lg:grid-cols-12 lg:items-start">
          {/* ============ LEFT COLUMN ============ */}
          <div className="contents lg:col-span-7 lg:flex lg:flex-col lg:gap-4">
            {/* Big panel */}
            <div className="order-1">
              <div className="border border-white/20 bg-[#111] p-4 sm:p-6">
                {/* Frequency + live chip */}
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl sm:text-7xl font-extrabold leading-none" style={{ color: accent }}>
                        {freqStr}
                      </span>
                      <span className="text-sm sm:text-base font-bold text-white/80">FM</span>
                    </div>
                    <p className="mt-1 text-[8px] uppercase tracking-[0.3em] text-white/40">
                      Band Frequency Tuner
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 border border-white/20 px-2.5 py-1">
                    <span
                      className={`h-2 w-2 rounded-full ${isLiveActive ? "animate-pulse" : ""}`}
                      style={{ backgroundColor: liveDotColor }}
                    />
                    <span className="text-[9px] uppercase tracking-[0.15em] text-white/80">Live Stream</span>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-white/10 my-4" />

                {/* Station name row */}
                <div className="flex items-center gap-4">
                  <div
                    className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 shrink-0"
                    style={{ backgroundColor: accent }}
                  >
                    <Radio className="h-6 w-6 sm:h-7 sm:w-7 text-black" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-lg sm:text-2xl font-extrabold uppercase tracking-tight text-white truncate">
                      {current.name}
                    </h1>
                    <p className="text-[9px] uppercase tracking-[0.25em] text-white/40 mt-0.5">
                      Genre: {genre}
                    </p>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-white/10 my-4" />

                {/* Equalizer well */}
                <div className="border border-white/10 bg-black p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[8px] uppercase tracking-[0.25em] text-white/40">
                      Spectrogram Equalizer
                    </span>
                    <span
                      className="text-[8px] uppercase tracking-[0.25em] font-bold"
                      style={{ color: isPlaying ? accent : "#666" }}
                    >
                      {isPlaying ? "Active Signal" : "Offline"}
                    </span>
                  </div>
                  <EqualizerCanvas isPlaying={isPlaying} accent={accent} />
                </div>
              </div>
            </div>

            {/* Tuner strip */}
            <div className="order-3">
              <div className="border border-white/20 bg-[#111] px-4 py-3">
                <div className="flex items-center justify-between text-[8px] uppercase tracking-[0.2em] mb-2">
                  <span className="text-white/40">88.0 MHz</span>
                  <span className="font-bold" style={{ color: accent }}>
                    ▲ Tuned: {freqStr} MHz
                  </span>
                  <span className="text-white/40">108.0 MHz</span>
                </div>
                <div className="relative h-[2px] bg-white/10 w-full">
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-2 h-3"
                    style={{
                      left: `${Math.min(Math.max(tunerPct, 0), 100)}%`,
                      backgroundColor: STATUS_GREEN,
                      transform: "translate(-50%, -50%)",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ============ RIGHT COLUMN ============ */}
          <div className="contents lg:col-span-5 lg:flex lg:flex-col lg:gap-4">
            {/* Playback controls */}
            <div className="order-2">
              <div className="border border-white/20 bg-[#111] p-4 sm:p-5">
                <p className="text-[9px] uppercase tracking-[0.25em] text-white/40 mb-4">
                  Playback Controls
                </p>

                {/* Play / Pause button */}
                <button
                  onClick={toggle}
                  className="flex w-full items-center justify-center gap-3 bg-white text-black py-3.5 text-xs font-extrabold uppercase tracking-[0.2em] hover:bg-white/90 transition-colors mb-3"
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {isPlaying ? "Pause Stream" : "Play Stream"}
                </button>

                {/* Prev / Next */}
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <button
                    onClick={prev}
                    disabled={stationCount <= 1}
                    className="flex items-center justify-center gap-2 border border-white/20 py-2.5 text-[10px] font-bold uppercase tracking-[0.15em] text-white hover:border-white/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <SkipBack className="h-3 w-3" />
                    Prev Station
                  </button>
                  <button
                    onClick={next}
                    disabled={stationCount <= 1}
                    className="flex items-center justify-center gap-2 border border-white/20 py-2.5 text-[10px] font-bold uppercase tracking-[0.15em] text-white hover:border-white/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Next Station
                    <SkipForward className="h-3 w-3" />
                  </button>
                </div>

                <p className="text-center text-[8px] uppercase tracking-[0.25em] text-white/30 mb-4">
                  Station {pad(stationIdx)} of {pad(stationCount)} in {genre}
                </p>

                {/* Volume well */}
                <div className="border border-white/10 bg-black p-3 mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {muted ? (
                        <VolumeX className="h-3.5 w-3.5 text-white/50" />
                      ) : (
                        <Volume2 className="h-3.5 w-3.5 text-white/50" />
                      )}
                      <span className="text-[9px] uppercase tracking-[0.2em] text-white/60">
                        Volume: {muted ? "0" : Math.round(volume * 100)}%
                      </span>
                    </div>
                    <button
                      onClick={toggleMute}
                      className="border border-white/20 px-2 py-0.5 text-[8px] uppercase tracking-[0.15em] text-white/60 hover:text-white hover:border-white/50 transition-colors"
                    >
                      {muted ? "Unmute" : "Mute"}
                    </button>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={muted ? 0 : volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    className="np-slider w-full h-1 appearance-none bg-white/20 outline-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #fff ${(muted ? 0 : volume) * 100}%, rgba(255,255,255,0.2) ${(muted ? 0 : volume) * 100}%)`,
                    }}
                  />
                </div>

                {/* Favorites button */}
                <button
                  onClick={() => toggleFavorite(current)}
                  className={`flex w-full items-center justify-center gap-2 border py-2.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors ${
                    fav
                      ? "border-white/40 text-white bg-white/10 hover:bg-white/5"
                      : "border-white/20 text-white/70 hover:border-white/50 hover:text-white"
                  }`}
                >
                  <Heart className={`h-3.5 w-3.5 ${fav ? "fill-white" : ""}`} />
                  {fav ? "Remove from Favorites" : "Add to Favorites"}
                </button>
              </div>
            </div>

            {/* Error strip + stream info */}
            <div className="order-4 flex flex-col gap-3 sm:gap-4">
              {/* Error strip */}
              {error && (
                <div className="border border-red-500/50 bg-red-500/10 p-3 flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-red-400">
                    Signal Error: {error}
                  </span>
                  <button
                    onClick={handleRetry}
                    className="border border-red-500/50 px-3 py-1 text-[9px] uppercase tracking-[0.15em] text-red-400 hover:bg-red-500/20 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Stream info panel */}
              <div className="border border-white/20 bg-[#111] p-4 sm:p-5">
                {/* Status row */}
                <div className="flex items-center justify-between py-2">
                  <span className="text-[9px] uppercase tracking-[0.25em] text-white/40">
                    Stream Status:
                  </span>
                  <span
                    className="text-[9px] uppercase tracking-[0.2em] font-bold"
                    style={{ color: statusColour }}
                  >
                    {statusLabel}
                  </span>
                </div>
                <div className="border-t border-white/10" />

                {/* Audio stream row */}
                <div className="flex items-center justify-between py-2 gap-4">
                  <span className="text-[9px] uppercase tracking-[0.25em] text-white/40 shrink-0">
                    Audio Stream:
                  </span>
                  <span
                    className="text-[9px] uppercase tracking-[0.15em] text-white/60 truncate text-right"
                    title={current.streamUrl}
                  >
                    {current.streamUrl}
                  </span>
                </div>
                <div className="border-t border-white/10" />

                {/* Format row */}
                <div className="flex items-center justify-between py-2">
                  <span className="text-[9px] uppercase tracking-[0.25em] text-white/40">
                    Format:
                  </span>
                  <span className="text-[9px] uppercase tracking-[0.2em] text-white/70 font-bold">
                    {format}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}